const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  socialLogin,
  getUserProfile,
  updateUserProfile,
  registerPushToken,
  removePushToken,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/social-login', socialLogin);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/push-token', protect, registerPushToken);
router.post('/push-token/remove', protect, removePushToken);

module.exports = router;
