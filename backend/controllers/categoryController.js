const Category = require('../models/Category');
const Product = require('../models/Product');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    const icon = (req.body.icon || 'pricetag-outline').trim();

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({ name, description, icon });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const previousName = category.name;
    const nextName = req.body.name !== undefined ? String(req.body.name).trim() : category.name;

    if (!nextName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    category.name = nextName;
    if (req.body.description !== undefined) {
      category.description = String(req.body.description).trim();
    }
    if (req.body.icon !== undefined) {
      category.icon = String(req.body.icon).trim();
    }

    const updated = await category.save();
    if (previousName !== nextName) {
      await Product.updateMany({ category: previousName }, { category: nextName });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const inUse = await Product.exists({ category: category.name });
    if (inUse) {
      return res.status(400).json({
        message: 'Cannot delete a category assigned to existing products',
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
