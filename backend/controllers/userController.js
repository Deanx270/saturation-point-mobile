const User = require('../models/User');
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

const registerUser = async (req, res) => {
  try {
    const { email, password, displayName, username, photoURL, pushToken, device } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'Email, password, and display name are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const initialPushTokens = [];
    if (pushToken) {
      initialPushTokens.push({ token: pushToken, device: device || 'mobile', updatedAt: new Date() });
    }

    const user = await User.create({
      email,
      password: hashedPassword,
      displayName,
      username: username || email.split('@')[0],
      photoURL: photoURL || '',
      role: 'user',
      status: 'active',
      pushTokens: initialPushTokens,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      photoURL: user.photoURL,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, pushToken, device } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (pushToken) {
      user.pushTokens = user.pushTokens.filter((item) => item.token !== pushToken);
      user.pushTokens.push({ token: pushToken, device: device || 'mobile', updatedAt: new Date() });
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      photoURL: user.photoURL,
      role: user.role,
      token,
    });
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
        displayName: displayName || email.split('@')[0],
        username: email.split('@')[0] + Math.floor(Math.random() * 1000),
        photoURL: photoURL || '',
        role: 'user',
        status: 'active',
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

    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      photoURL: user.photoURL,
      role: user.role,
      token,
    });
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

    user.displayName = req.body.displayName || user.displayName;
    user.username = req.body.username || user.username;
    if (req.file && req.file.path) {
      user.photoURL = req.file.path;
    } else if (req.body.photoURL !== undefined) {
      user.photoURL = req.body.photoURL;
    }

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      photoURL: user.photoURL,
      role: user.role,
    });
  } catch (error) {
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

module.exports = {
  registerUser,
  loginUser,
  socialLogin,
  getUserProfile,
  updateUserProfile,
  registerPushToken,
  removePushToken,
};
