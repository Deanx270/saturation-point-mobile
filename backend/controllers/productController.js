const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseStringArray = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (e) {
        return [];
      }
    }
    return [trimmed];
  }
  return [];
};

const extractImageUrls = (req, fallbackImages = null) => {
  const uploadedPaths = Array.isArray(req.files) ? req.files.map((file) => file.path) : [];

  if (req.body.imageManifest) {
    const manifest = parseStringArray(req.body.imageManifest);
    const ordered = [];
    for (const entry of manifest) {
      if (entry.startsWith('remote:')) {
        const url = entry.slice('remote:'.length);
        if (url) {
          ordered.push(url);
        }
      } else if (entry.startsWith('upload:')) {
        const idx = Number(entry.slice('upload:'.length));
        if (!Number.isNaN(idx) && uploadedPaths[idx]) {
          ordered.push(uploadedPaths[idx]);
        }
      }
    }
    if (ordered.length > 0) {
      return ordered;
    }
  }

  const hasExplicitExisting = req.body.existingImages !== undefined;
  const hasExplicitImages = req.body.images !== undefined;

  if (hasExplicitExisting || uploadedPaths.length > 0) {
    const existing = hasExplicitExisting
      ? parseStringArray(req.body.existingImages)
      : fallbackImages || parseStringArray(req.body.images);
    return [...existing, ...uploadedPaths];
  }

  if (hasExplicitImages) {
    return parseStringArray(req.body.images);
  }

  return fallbackImages;
};

const getProducts = async (req, res) => {
  try {
    const { keyword, category, brand, minPrice, maxPrice, minRating, sort } = req.query;

    const query = {};

    if (keyword) {
      const safeKeyword = escapeRegex(keyword.trim());
      query.$or = [
        { name: { $regex: safeKeyword, $options: 'i' } },
        { description: { $regex: safeKeyword, $options: 'i' } },
        { brand: { $regex: safeKeyword, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (brand && brand !== 'All') {
      query.brand = brand;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        query.price.$lte = Number(maxPrice);
      }
    }

    if (minRating !== undefined && minRating !== '' && !Number.isNaN(Number(minRating))) {
      const ratingThreshold = Number(minRating);
      if (ratingThreshold > 0) {
        query.rating = { $gte: ratingThreshold };
      }
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price-low') {
      sortOption = { price: 1 };
    } else if (sort === 'price-high') {
      sortOption = { price: -1 };
    } else if (sort === 'rating') {
      sortOption = { rating: -1 };
    }

    const products = await Product.find(query).sort(sortOption);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, brand, category, stock } = req.body;

    if (!name || price === undefined || price === '' || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ message: 'Price must be a valid positive number' });
    }

    const resolvedImages = extractImageUrls(req, []);

    const product = await Product.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      price: numericPrice,
      brand: brand ? String(brand).trim() : 'House Selection',
      category: String(category).trim(),
      stock: stock !== undefined && stock !== '' ? Number(stock) : 10,
      images: resolvedImages || [],
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, description, price, brand, category, stock } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.name = name !== undefined ? String(name).trim() : product.name;
    product.description =
      description !== undefined ? String(description).trim() : product.description;
    product.price =
      price !== undefined && price !== '' ? Number(price) : product.price;
    product.brand = brand !== undefined ? String(brand).trim() : product.brand;
    product.category =
      category !== undefined ? String(category).trim() : product.category;
    product.stock =
      stock !== undefined && stock !== '' ? Number(stock) : product.stock;

    const nextImages = extractImageUrls(req, product.images);
    if (nextImages !== null) {
      product.images = nextImages;
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategoriesAndBrands = async (req, res) => {
  try {
    const [categoryDocs, brandDocs, productCategories, productBrands] = await Promise.all([
      Category.find({}).sort({ name: 1 }),
      Brand.find({}).sort({ name: 1 }),
      Product.distinct('category'),
      Product.distinct('brand'),
    ]);

    const categorySet = new Set([
      ...categoryDocs.map((c) => c.name),
      ...productCategories.filter(Boolean),
    ]);
    const brandSet = new Set([
      ...brandDocs.map((b) => b.name),
      ...productBrands.filter(Boolean),
    ]);

    res.json({
      categories: Array.from(categorySet).sort((a, b) => a.localeCompare(b)),
      brands: Array.from(brandSet).sort((a, b) => a.localeCompare(b)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategoriesAndBrands,
};
