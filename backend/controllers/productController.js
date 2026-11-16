const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const User = require('../models/User');

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSpaces = (text) => String(text || '').trim().replace(/\s+/g, ' ');

const resolveCanonicalBrand = async (rawBrand) => {
  const cleanBrand = normalizeSpaces(rawBrand);
  if (!cleanBrand) {
    return '';
  }
  const existing = await Brand.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(cleanBrand)}$`, 'i') },
  });
  if (existing) {
    return existing.name;
  }
  await Brand.updateOne(
    { name: cleanBrand },
    { $setOnInsert: { name: cleanBrand } },
    { upsert: true }
  );
  return cleanBrand;
};

const syncProductReviewAuthors = async (input) => {
  const isArray = Array.isArray(input);
  const rawList = isArray ? input : input ? [input] : [];
  if (rawList.length === 0) {
    return input;
  }

  const normalized = rawList.map((doc) =>
    doc && typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
  );

  const userIdsSet = new Set();
  normalized.forEach((product) => {
    if (Array.isArray(product.reviews)) {
      product.reviews.forEach((rev) => {
        if (rev?.user) {
          userIdsSet.add(String(rev.user));
        }
      });
    }
  });

  if (userIdsSet.size > 0) {
    const users = await User.find({ _id: { $in: Array.from(userIdsSet) } })
      .select('displayName photoURL')
      .lean();
    const userMap = new Map(
      users
        .filter((u) => u && u._id)
        .map((u) => [String(u._id), { displayName: u.displayName, photoURL: u.photoURL || '' }])
    );

    normalized.forEach((product) => {
      if (Array.isArray(product.reviews)) {
        product.reviews = product.reviews.map((rev) => {
          const userInfo = rev?.user ? userMap.get(String(rev.user)) : null;
          if (!userInfo) {
            return rev;
          }
          return {
            ...rev,
            name: userInfo.displayName || rev.name,
            photoURL: userInfo.photoURL || '',
          };
        });
      }
    });
  }

  return isArray ? normalized : normalized[0];
};

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

    let sortOption = { createdAt: -1, _id: -1 };
    if (sort === 'price-low') {
      sortOption = { price: 1, _id: 1 };
    } else if (sort === 'price-high') {
      sortOption = { price: -1, _id: 1 };
    } else if (sort === 'rating') {
      sortOption = { rating: -1, _id: 1 };
    }

    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;

    if (hasPagination) {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 8));
      const skip = (page - 1) * limit;

      const [total, products] = await Promise.all([
        Product.countDocuments(query),
        Product.find(query).sort(sortOption).skip(skip).limit(limit),
      ]);

      const syncedProducts = await syncProductReviewAuthors(products);

      return res.json({
        products: syncedProducts,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: skip + products.length < total,
      });
    }

    const products = await Product.find(query).sort(sortOption);
    const syncedProducts = await syncProductReviewAuthors(products);
    res.json(syncedProducts);
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
    const syncedProduct = await syncProductReviewAuthors(product);
    res.json(syncedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, brand, category, stock } = req.body;
    const cleanName = normalizeSpaces(name);
    const cleanCategory = normalizeSpaces(category);

    if (!cleanName || price === undefined || price === '' || !cleanCategory) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ message: 'Price must be a valid positive number' });
    }

    const resolvedImages = extractImageUrls(req, []);
    const resolvedBrand = brand ? await resolveCanonicalBrand(brand) : 'House Selection';

    const product = await Product.create({
      name: cleanName,
      description: description ? String(description).trim() : '',
      price: numericPrice,
      brand: resolvedBrand || 'House Selection',
      category: cleanCategory,
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

    if (name !== undefined) {
      const cleanName = normalizeSpaces(name);
      if (!cleanName) {
        return res.status(400).json({ message: 'Product name cannot be empty' });
      }
      product.name = cleanName;
    }
    product.description =
      description !== undefined ? String(description).trim() : product.description;
    product.price =
      price !== undefined && price !== '' ? Number(price) : product.price;
    if (brand !== undefined) {
      const resolvedBrand = await resolveCanonicalBrand(brand);
      if (!resolvedBrand) {
        return res.status(400).json({ message: 'Brand cannot be empty' });
      }
      product.brand = resolvedBrand;
    }
    if (category !== undefined) {
      const cleanCategory = normalizeSpaces(category);
      if (!cleanCategory) {
        return res.status(400).json({ message: 'Category cannot be empty' });
      }
      product.category = cleanCategory;
    }
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
