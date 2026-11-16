const Brand = require('../models/Brand');
const Product = require('../models/Product');

const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

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
    const name = normalizeName(req.body.name);
    const origin = normalizeName(req.body.origin);
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

const updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    const previousName = brand.name;
    const nextName =
      req.body.name !== undefined ? normalizeName(req.body.name) : brand.name;

    if (!nextName) {
      return res.status(400).json({ message: 'Brand name is required' });
    }

    const conflict = await Brand.findOne({
      _id: { $ne: brand._id },
      name: {
        $regex: new RegExp(`^${nextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      },
    });
    if (conflict) {
      return res.status(400).json({ message: 'Another brand with that name already exists' });
    }

    brand.name = nextName;
    if (req.body.origin !== undefined) {
      brand.origin = normalizeName(req.body.origin);
    }
    if (req.body.description !== undefined) {
      brand.description = String(req.body.description).trim();
    }

    const updated = await brand.save();
    if (previousName !== nextName) {
      await Product.updateMany({ brand: previousName }, { brand: nextName });
    }

    res.json(updated);
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
  updateBrand,
  deleteBrand,
};
