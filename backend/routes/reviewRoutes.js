const express = require('express');
const router = express.Router();
const {
  checkReviewEligibility,
  addReview,
  updateReview,
  deleteReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:productId/eligibility', protect, checkReviewEligibility);
router.post('/:productId', protect, addReview);
router.put('/:productId/:reviewId', protect, updateReview);
router.delete('/:productId/:reviewId', protect, deleteReview);

module.exports = router;
