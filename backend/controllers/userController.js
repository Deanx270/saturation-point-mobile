const User = require('../models/User');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');

const getAppBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.API_URL) {
    return process.env.API_URL.replace(/\/+$/, '');
  }
  const host = req.get('host') || 'localhost:5000';
  return `${req.protocol}://${host}`;
};

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatFallbackNameFromEmail = (email) => {
  const localPart = String(email || '').split('@')[0] || 'Customer';
  const cleaned = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return 'Customer';
  }
  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildUserPayload = (user, token) => {
  const payload = {
    _id: user._id,
    email: user.email,
    displayName: user.displayName,
    username: user.username || '',
    photoURL: user.photoURL,
    role: user.role,
    isEmailVerified: Boolean(user.isEmailVerified),
    profileCompleted: Boolean(user.profileCompleted || user.username),
  };
  if (token) {
    payload.token = token;
  }
  return payload;
};

const attachDevicePushToken = async (user, pushToken, device) => {
  const cleanToken = typeof pushToken === 'string' ? pushToken.trim() : '';
  if (!cleanToken) {
    return false;
  }

  await User.updateMany(
    { _id: { $ne: user._id }, 'pushTokens.token': cleanToken },
    { $pull: { pushTokens: { token: cleanToken } } }
  );

  user.pushTokens = (user.pushTokens || []).filter((item) => item.token !== cleanToken);
  user.pushTokens.push({
    token: cleanToken,
    device: device || 'mobile',
    updatedAt: new Date(),
  });
  return true;
};

const registerUser = async (req, res) => {
  try {
    const { email, password, displayName, username, photoURL, pushToken, device } = req.body;
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let cleanUsername;
    if (typeof username === 'string' && username.trim()) {
      cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
      if (!USERNAME_REGEX.test(cleanUsername)) {
        return res.status(400).json({
          message: 'Username must be 3 to 30 characters using letters, numbers, or underscores',
        });
      }
      const existingUsername = await User.findOne({
        username: { $regex: new RegExp(`^${escapeRegex(cleanUsername)}$`, 'i') },
      });
      if (existingUsername) {
        return res.status(400).json({ message: 'That username is already taken' });
      }
    }

    const cleanDisplayName =
      typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : formatFallbackNameFromEmail(cleanEmail);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const userData = {
      email: cleanEmail,
      password: hashedPassword,
      displayName: cleanDisplayName,
      photoURL: photoURL || '',
      role: 'user',
      status: 'active',
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      profileCompleted: Boolean(cleanUsername),
      pushTokens: [],
    };
    if (cleanUsername) {
      userData.username = cleanUsername;
    }

    const user = await User.create(userData);
    if (await attachDevicePushToken(user, pushToken, device)) {
      await user.save();
    }

    const verificationUrl = `${getAppBaseUrl(req)}/api/users/verify-email?token=${rawToken}`;
    await sendVerificationEmail(cleanEmail, verificationUrl, cleanDisplayName);

    res.status(201).json({
      requiresVerification: true,
      isEmailVerified: false,
      email: user.email,
      displayName: user.displayName,
      message: 'Account registered successfully. Please check your email to verify your account before signing in.',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or username is already registered' });
    }
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email;
    const { password, pushToken, device } = req.body;
    const normalizedIdentifier =
      typeof rawIdentifier === 'string'
        ? rawIdentifier.trim().replace(/^@/, '').toLowerCase()
        : '';

    if (!normalizedIdentifier || !password) {
      return res.status(400).json({ message: 'Email or username and password are required' });
    }

    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
      ],
    }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email, username, or password' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email, username, or password' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in.',
        isEmailVerified: false,
        email: user.email,
      });
    }

    if (await attachDevicePushToken(user, pushToken, device)) {
      await user.save();
    }

    const token = generateToken(user._id);

    res.json(buildUserPayload(user, token));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFirebaseAuth = () => {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return null;
  }
  const { getApps, initializeApp, cert } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getAuth();
};

const socialLogin = async (req, res) => {
  try {
    const { idToken, pushToken, device } = req.body;

    if (!idToken) {
      return res.status(401).json({ message: 'Firebase ID token is required for social login' });
    }

    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      return res.status(501).json({ message: 'Social login is not configured on this server' });
    }

    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;
    const displayName = decodedToken.name;
    const photoURL = decodedToken.picture;

    if (!email) {
      return res.status(401).json({ message: 'Verified social account email is required' });
    }

    let user = await User.findOne({ $or: [{ firebaseUid }, { email }] });

    if (!user) {
      user = await User.create({
        firebaseUid,
        email,
        displayName: displayName || formatFallbackNameFromEmail(email),
        photoURL: photoURL || '',
        role: 'user',
        status: 'active',
        isEmailVerified: true,
        profileCompleted: false,
      });
    } else {
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      if (firebaseUid && !user.firebaseUid) {
        user.firebaseUid = firebaseUid;
      }
      if (displayName && user.displayName !== displayName) {
        user.displayName = displayName;
      }
      if (photoURL && user.photoURL !== photoURL) {
        user.photoURL = photoURL;
      }
    }

    await attachDevicePushToken(user, pushToken, device);

    await user.save();
    const token = generateToken(user._id);

    res.json(buildUserPayload(user, token));
  } catch (error) {
    if (error.code && String(error.code).startsWith('auth/')) {
      return res.status(401).json({ message: 'Invalid or expired social authentication token' });
    }
    res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let displayNameChanged = false;
    if (typeof req.body.displayName === 'string' && req.body.displayName.trim()) {
      user.displayName = req.body.displayName.trim();
      displayNameChanged = true;
    }
    if (typeof req.body.username === 'string' && req.body.username.trim()) {
      const cleanUsername = req.body.username.trim().replace(/^@/, '').toLowerCase();
      if (!USERNAME_REGEX.test(cleanUsername)) {
        return res.status(400).json({
          message: 'Username must be 3 to 30 characters using letters, numbers, or underscores',
        });
      }
      const existingOwner = await User.findOne({
        _id: { $ne: user._id },
        username: { $regex: new RegExp(`^${escapeRegex(cleanUsername)}$`, 'i') },
      });
      if (existingOwner) {
        return res.status(400).json({ message: 'That username is already taken' });
      }
      user.username = cleanUsername;
      user.profileCompleted = true;
    }
    if (req.body.skipOnboarding === true || req.body.profileCompleted === true) {
      user.profileCompleted = true;
    }
    let photoURLChanged = false;
    if (req.file && req.file.path) {
      user.photoURL = req.file.path;
      photoURLChanged = true;
    } else if (req.body.photoURL !== undefined) {
      user.photoURL = req.body.photoURL;
      photoURLChanged = true;
    }

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    if ((displayNameChanged || photoURLChanged) && user.displayName) {
      await Product.updateMany(
        { 'reviews.user': user._id },
        { $set: { 'reviews.$[elem].name': user.displayName } },
        { arrayFilters: [{ 'elem.user': user._id }] }
      );
    }

    res.json(buildUserPayload(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'That username is already taken' });
    }
    res.status(500).json({ message: error.message });
  }
};

const registerPushToken = async (req, res) => {
  try {
    const { pushToken, device } = req.body;
    if (!pushToken) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await attachDevicePushToken(user, pushToken, device);
    await user.save();

    res.json({ message: 'Push token registered successfully', tokensCount: user.pushTokens.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.pushTokens = user.pushTokens.filter((item) => item.token !== pushToken);
    await user.save();

    res.json({ message: 'Push token removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkUsernameAvailability = async (req, res) => {
  try {
    const raw = typeof req.query.username === 'string' ? req.query.username : '';
    const clean = raw.trim().replace(/^@/, '').toLowerCase();
    if (!clean || !USERNAME_REGEX.test(clean)) {
      return res.json({
        available: false,
        valid: false,
        message: 'Use 3 to 30 letters, numbers, or underscores.',
      });
    }
    const existing = await User.findOne({
      username: { $regex: new RegExp(`^${escapeRegex(clean)}$`, 'i') },
    })
      .select('_id')
      .lean();
    res.json({
      available: !existing,
      valid: true,
      username: clean,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const renderVerificationPage = ({ success, title, subtitle, email = '' }) => {
  const iconSvg = success
    ? `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - The Saturation Point</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,400&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #FAF9F6;
      color: #1C1917;
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #FFFFFF;
      max-width: 460px;
      width: 100%;
      border-radius: 12px;
      border: 1px solid #E7E5E4;
      border-top: 4px solid #CA8A04;
      box-shadow: 0 10px 25px -5px rgba(28, 25, 23, 0.05), 0 8px 10px -6px rgba(28, 25, 23, 0.04);
      padding: 44px 32px 36px;
      text-align: center;
    }
    .icon-wrapper {
      width: 68px;
      height: 68px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background-color: #FAF9F6;
      border: 1px solid #E7E5E4;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-eyebrow {
      font-size: 10.5px;
      font-weight: 600;
      color: #A16207;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    h1 {
      font-family: 'Lora', Georgia, serif;
      font-size: 24px;
      font-weight: 600;
      color: #1C1917;
      letter-spacing: -0.3px;
      margin-bottom: 14px;
    }
    p {
      font-size: 14.5px;
      line-height: 1.6;
      color: #57534E;
      margin-bottom: 28px;
    }
    .email-highlight {
      font-weight: 600;
      color: #1C1917;
      word-break: break-all;
    }
    .btn {
      display: inline-block;
      width: 100%;
      background-color: #1C1917;
      color: #FFFFFF;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      text-decoration: none;
      padding: 15px 24px;
      border-radius: 6px;
      transition: background-color 0.2s ease;
    }
    .btn:hover {
      background-color: #292524;
    }
    .footer-note {
      font-size: 12px;
      color: #A8A29E;
      margin-top: 24px;
      margin-bottom: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      ${iconSvg}
    </div>
    <div class="brand-eyebrow">The Saturation Point</div>
    <h1>${title}</h1>
    <p>${subtitle}${email ? `<br><span class="email-highlight">${email}</span>` : ''}</p>
    <a href="saturationpoint://login" class="btn">Open Saturation Point App</a>
    <p class="footer-note">You can also return to the app manually.</p>
  </div>
</body>
</html>`;
};

const verifyEmail = async (req, res) => {
  try {
    const rawToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!rawToken) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ success: false, message: 'Verification token is missing' });
      }
      return res.status(400).send(
        renderVerificationPage({
          success: false,
          title: 'Verification Token Missing',
          subtitle: 'No verification token was provided in this confirmation link.',
        })
      );
    }

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'This verification link has expired or has already been used.',
        });
      }
      return res.status(400).send(
        renderVerificationPage({
          success: false,
          title: 'Link Expired or Already Used',
          subtitle: 'This confirmation link is invalid or has expired. Please sign in or request a new confirmation link from the app.',
        })
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        message: 'Email verified successfully. You can now sign in.',
      });
    }

    return res.send(
      renderVerificationPage({
        success: true,
        title: 'Email Confirmed',
        subtitle: 'Your email has been verified successfully. Your Saturation Point account is now active.',
        email: user.email,
      })
    );
  } catch (error) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.status(500).send(
      renderVerificationPage({
        success: false,
        title: 'Verification Error',
        subtitle: 'An unexpected error occurred while verifying your email. Please try again later.',
      })
    );
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const rawInput = req.body.email || req.body.identifier;
    const cleanInput = typeof rawInput === 'string' ? rawInput.trim().toLowerCase() : '';
    if (!cleanInput) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({
      $or: [{ email: cleanInput }, { username: cleanInput }],
    });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Your email is already verified. You can sign in directly.',
        isEmailVerified: true,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verificationUrl = `${getAppBaseUrl(req)}/api/users/verify-email?token=${rawToken}`;
    await sendVerificationEmail(user.email, verificationUrl, user.displayName);

    res.json({
      message: 'A fresh confirmation link has been sent to your email.',
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  socialLogin,
  getUserProfile,
  updateUserProfile,
  checkUsernameAvailability,
  registerPushToken,
  removePushToken,
};
