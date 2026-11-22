const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
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
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../utils/cloudinary');

const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many verification requests. Please wait 15 minutes and try again.',
  },
});

router.get('/check-username', checkUsernameAvailability);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, resendVerificationEmail);
router.post('/social-login', socialLogin);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('photo'), updateUserProfile);
router.post('/push-token', protect, registerPushToken);
router.post('/push-token/remove', protect, removePushToken);

module.exports = router;
