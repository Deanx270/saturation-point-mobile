const Brand = require('../models/Brand');
const Product = require('../models/Product');

const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({}).sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createBrand = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const origin = (req.body.origin || '').trim();
    const description = (req.body.description || '').trim();

    if (!name) {
      return res.status(400).json({ message: 'Brand name is required' });
    }

    const existing = await Brand.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ message: 'Brand already exists' });
    }

    const brand = await Brand.create({ name, origin, description });
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    const inUse = await Product.exists({ brand: brand.name });
    if (inUse) {
      return res.status(400).json({
        message: 'Cannot delete a brand assigned to existing products',
      });
    }

    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: 'Brand removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBrands,
  createBrand,
  deleteBrand,
};
