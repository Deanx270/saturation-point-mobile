const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategoriesAndBrands,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { upload } = require('../utils/cloudinary');

router.get('/', getProducts);
router.get('/meta/filters', getCategoriesAndBrands);
router.get('/:id', getProductById);
router.post('/', protect, adminOnly, upload.array('images', 5), createProduct);
router.put('/:id', protect, adminOnly, upload.array('images', 5), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
