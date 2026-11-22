const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');

let cachedLogoDataUri = null;

const getLogoDataUri = () => {
  if (cachedLogoDataUri !== null) {
    return cachedLogoDataUri;
  }
  try {
    const logoBuffer = fs.readFileSync(path.join(__dirname, '../assets/logo-mark.png'));
    cachedLogoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (e) {
    cachedLogoDataUri = '';
  }
  return cachedLogoDataUri;
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getAppBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.API_URL) {
    return process.env.API_URL.replace(/\/+$/, '');
  }
  const forwardedProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0].trim()
    : '';
  const protocol = forwardedProto || req.protocol;
  const host = req.get('host') || 'localhost:5000';
  return `${protocol}://${host}`;
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

const RESEND_COOLDOWN_MS = 60 * 1000;

const getRemainingCooldownSeconds = (user) => {
  if (!user?.emailVerificationSentAt) {
    return 0;
  }
  const elapsed = Date.now() - new Date(user.emailVerificationSentAt).getTime();
  if (elapsed >= RESEND_COOLDOWN_MS) {
    return 0;
  }
  return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
};

const registerUser = async (req, res) => {
  try {
    const { email, password, displayName, username, photoURL } = req.body;
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userExists = await User.findOne({ email: cleanEmail }).select('+emailVerificationSentAt');
    if (userExists) {
      if (!userExists.isEmailVerified) {
        return res.status(409).json({
          message: 'This email is already registered, but not yet confirmed.',
          isEmailVerified: false,
          email: userExists.email,
          retryAfterSeconds: getRemainingCooldownSeconds(userExists),
        });
      }
      return res.status(400).json({ message: 'An account with this email already exists.' });
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
    const greetingName =
      typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : '';

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
      emailVerificationSentAt: new Date(),
      profileCompleted: Boolean(cleanUsername),
      pushTokens: [],
    };
    if (cleanUsername) {
      userData.username = cleanUsername;
    }

    const user = await User.create(userData);

    const verificationUrl = `${getAppBaseUrl(req)}/api/users/verify-email?token=${rawToken}`;
    const emailSent = await sendVerificationEmail(cleanEmail, verificationUrl, greetingName);

    if (!emailSent) {
      user.emailVerificationSentAt = undefined;
      await user.save();
    }

    res.status(201).json({
      requiresVerification: true,
      isEmailVerified: false,
      emailSent,
      cooldownSeconds: emailSent ? 60 : 0,
      email: user.email,
      displayName: user.displayName,
      message: emailSent
        ? 'Account created. Check your inbox to confirm your email before signing in.'
        : 'Account created, but the confirmation email could not be sent yet. Tap Resend below.',
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
    }).select('+password +emailVerificationSentAt');
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
        message: 'Confirm your email address before signing in.',
        isEmailVerified: false,
        email: user.email,
        retryAfterSeconds: getRemainingCooldownSeconds(user),
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
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeEmail = email ? escapeHtml(email) : '';
  const logoDataUri = getLogoDataUri();
  const deepLinkHref =
    success && email
      ? `saturationpoint://login?prefillEmail=${encodeURIComponent(email)}&verified=true`
      : 'saturationpoint://login';

  const iconSvg = success
    ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1F6B45" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#991B1B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  const iconFrameClass = success ? 'icon-frame icon-success' : 'icon-frame icon-error';
  const brandLogoMarkup = logoDataUri
    ? `<img src="${logoDataUri}" alt="The Saturation Point" class="brand-logo" width="26" height="26">`
    : '';
  const emailBoxMarkup = safeEmail
    ? `<div class="email-box">${safeEmail}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - The Saturation Point</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
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
      border-radius: 8px;
      border: 1px solid rgba(28, 25, 23, 0.08);
      border-top: 2px solid #CA8A04;
      box-shadow: 0 2px 8px rgba(28, 25, 23, 0.06);
      padding: 28px 28px 32px;
      text-align: center;
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding-bottom: 20px;
      margin-bottom: 28px;
      border-bottom: 1px solid rgba(28, 25, 23, 0.08);
    }
    .brand-logo {
      display: block;
      width: 26px;
      height: 26px;
      object-fit: contain;
    }
    .brand-name {
      font-family: 'Lora', Georgia, serif;
      font-size: 16px;
      font-weight: 600;
      color: #1C1917;
      letter-spacing: -0.1px;
    }
    .icon-frame {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-success {
      background-color: #EFF6F1;
      border: 1px solid #B9DBC4;
    }
    .icon-error {
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
    }
    h1 {
      font-family: 'Lora', Georgia, serif;
      font-size: 22px;
      font-weight: 600;
      color: #1C1917;
      letter-spacing: -0.2px;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 14px;
      line-height: 1.6;
      color: #44403C;
      margin-bottom: 20px;
    }
    .email-box {
      display: inline-block;
      max-width: 100%;
      background-color: #F4F2EC;
      border: 1px solid rgba(28, 25, 23, 0.08);
      border-radius: 6px;
      padding: 8px 16px;
      margin-bottom: 24px;
      font-size: 13px;
      font-weight: 600;
      color: #1C1917;
      word-break: break-all;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 48px;
      background-color: #1C1917;
      color: #FFFFFF;
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.2px;
      text-transform: none;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      transition: background-color 0.2s ease;
    }
    .btn:hover {
      background-color: #292524;
    }
    .footer-note {
      font-size: 12px;
      color: #57534E;
      margin-top: 20px;
      margin-bottom: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand-row">
      ${brandLogoMarkup}
      <span class="brand-name">The Saturation Point</span>
    </div>
    <div class="${iconFrameClass}">
      ${iconSvg}
    </div>
    <h1>${safeTitle}</h1>
    <p class="subtitle">${safeSubtitle}</p>
    ${emailBoxMarkup}
    <a href="${deepLinkHref}" class="btn">Open Saturation Point App</a>
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
          subtitle: 'This confirmation link is missing a verification token.',
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
          subtitle: 'This link has expired or was already used. Request a new one from the app.',
        })
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationSentAt = undefined;
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
        subtitle: 'Your account is now active and ready for sign-in.',
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
        subtitle: 'Unable to verify your email right now. Please try again shortly.',
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
    }).select('+emailVerificationSentAt');

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Your email is already verified. You can sign in directly.',
        isEmailVerified: true,
      });
    }

    const retryAfterSeconds = getRemainingCooldownSeconds(user);
    if (retryAfterSeconds > 0) {
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} seconds before requesting another confirmation link.`,
        retryAfterSeconds,
      });
    }

    const previousSentAt = user.emailVerificationSentAt;
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.emailVerificationSentAt = new Date();
    await user.save();

    const verificationUrl = `${getAppBaseUrl(req)}/api/users/verify-email?token=${rawToken}`;
    const greetingName = user.profileCompleted ? user.displayName : '';
    const emailSent = await sendVerificationEmail(user.email, verificationUrl, greetingName);

    if (!emailSent) {
      user.emailVerificationSentAt = previousSentAt;
      await user.save();
      return res.status(503).json({
        message: 'Unable to deliver the confirmation email right now. Please try again in a moment.',
      });
    }

    res.json({
      message: 'A new confirmation link has been sent to your email.',
      email: user.email,
      cooldownSeconds: 60,
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
