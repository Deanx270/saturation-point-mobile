const express = require('express');
const router = express.Router();
const {
  sendPromotionalNotification,
  getActivePromotions,
  deactivatePromotion,
} = require('../controllers/promotionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/active', getActivePromotions);
router.post('/broadcast', protect, adminOnly, sendPromotionalNotification);
router.delete('/:id', protect, adminOnly, deactivatePromotion);

module.exports = router;
