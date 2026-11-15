const Product = require('../models/Product');
const Order = require('../models/Order');
const { cleanText, isProfane } = require('../utils/profanityFilter');

const checkReviewEligibility = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const availedOrder = await Order.findOne({
      user: userId,
      status: 'delivered',
      'orderItems.product': productId,
    });

    res.json({
      eligible: Boolean(availedOrder),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const userName = req.user.displayName || 'Customer';

    const availedOrder = await Order.findOne({
      user: userId,
      status: 'delivered',
      'orderItems.product': productId,
    });

    if (!availedOrder) {
      return res.status(403).json({
        message: 'Only verified purchasers with delivered orders may submit a review.',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === userId.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Product already reviewed by this user' });
    }

    const sanitizedComment = cleanText(comment || '');

    const newReview = {
      user: userId,
      name: userName,
      rating: Number(rating),
      comment: sanitizedComment,
    };

    product.reviews.push(newReview);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({
      message: 'Review submitted successfully',
      review: newReview,
      productRating: product.rating,
      numReviews: product.numReviews,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (rating !== undefined) {
      review.rating = Number(rating);
    }
    if (comment !== undefined) {
      review.comment = cleanText(comment);
    }

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.json({
      message: 'Review updated successfully',
      review,
      productRating: product.rating,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    product.reviews.pull(reviewId);
    product.numReviews = product.reviews.length;
    product.rating =
      product.numReviews > 0
        ? product.reviews.reduce((acc, item) => item.rating + acc, 0) /
          product.numReviews
        : 0;

    await product.save();
    res.json({ message: 'Review removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  checkReviewEligibility,
  addReview,
  updateReview,
  deleteReview,
};
