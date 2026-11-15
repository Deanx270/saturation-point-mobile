const express = require('express');
const router = express.Router();
const { sendPromotionalNotification } = require('../controllers/promotionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/broadcast', protect, adminOnly, sendPromotionalNotification);

module.exports = router;
