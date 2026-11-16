const User = require('../models/User');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
    profileCompleted: Boolean(user.profileCompleted || user.username),
  };
  if (token) {
    payload.token = token;
  }
  return payload;
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

    const initialPushTokens = [];
    if (pushToken) {
      initialPushTokens.push({ token: pushToken, device: device || 'mobile', updatedAt: new Date() });
    }

    const userData = {
      email: cleanEmail,
      password: hashedPassword,
      displayName: cleanDisplayName,
      photoURL: photoURL || '',
      role: 'user',
      status: 'active',
      profileCompleted: Boolean(cleanUsername),
      pushTokens: initialPushTokens,
    };
    if (cleanUsername) {
      userData.username = cleanUsername;
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    res.status(201).json(buildUserPayload(user, token));
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

    if (pushToken) {
      user.pushTokens = user.pushTokens.filter((item) => item.token !== pushToken);
      user.pushTokens.push({ token: pushToken, device: device || 'mobile', updatedAt: new Date() });
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
        profileCompleted: false,
      });
    } else {
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

    if (pushToken) {
      user.pushTokens = user.pushTokens.filter((item) => item.token !== pushToken);
      user.pushTokens.push({ token: pushToken, device: device || 'mobile', updatedAt: new Date() });
    }

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

    user.pushTokens = user.pushTokens.filter((item) => item.token !== pushToken);
    user.pushTokens.push({ token: pushToken, device: device || 'mobile', updatedAt: new Date() });
    await user.save();

    if (displayNameChanged && user.displayName) {
      await Product.updateMany(
        { 'reviews.user': user._id },
        { $set: { 'reviews.$[elem].name': user.displayName } },
        { arrayFilters: [{ 'elem.user': user._id }] }
      );
    }

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

    if (displayNameChanged && user.displayName) {
      await Product.updateMany(
        { 'reviews.user': user._id },
        { $set: { 'reviews.$[elem].name': user.displayName } },
        { arrayFilters: [{ 'elem.user': user._id }] }
      );
    }

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

module.exports = {
  registerUser,
  loginUser,
  socialLogin,
  getUserProfile,
  updateUserProfile,
  checkUsernameAvailability,
  registerPushToken,
  removePushToken,
};
