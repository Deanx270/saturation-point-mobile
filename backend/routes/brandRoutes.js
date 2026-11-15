const express = require('express');
const router = express.Router();
const {
  getBrands,
  createBrand,
  deleteBrand,
} = require('../controllers/brandController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getBrands);
router.post('/', protect, adminOnly, createBrand);
router.delete('/:id', protect, adminOnly, deleteBrand);

module.exports = router;
