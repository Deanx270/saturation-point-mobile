const Promotion = require('../models/Promotion');

const computeDiscountedPrice = (basePrice, discountPercent) => {
  const numericPrice = Number(basePrice) || 0;
  const numericDiscount = Number(discountPercent) || 0;
  if (numericPrice <= 0) {
    return 0;
  }
  if (numericDiscount <= 0 || numericDiscount >= 100) {
    return numericPrice;
  }
  return Math.max(1, Math.round(numericPrice * (1 - numericDiscount / 100)));
};

const getActivePromotionsMap = async () => {
  const now = new Date();
  const activePromos = await Promotion.find({
    isActive: true,
    expiresAt: { $gt: now },
    'productIds.0': { $exists: true },
  })
    .sort({ createdAt: -1 })
    .lean();

  const promoByProductId = new Map();
  for (const promo of activePromos) {
    if (!Array.isArray(promo.productIds)) {
      continue;
    }
    for (const prodId of promo.productIds) {
      const key = String(prodId);
      if (!promoByProductId.has(key)) {
        promoByProductId.set(key, {
          _id: promo._id,
          title: promo.title,
          discountPercent: promo.discountPercent,
          expiresAt: promo.expiresAt,
        });
      }
    }
  }
  return promoByProductId;
};

const attachActivePromotions = async (input, existingMap = null) => {
  const isArray = Array.isArray(input);
  const rawList = isArray ? input : input ? [input] : [];
  if (rawList.length === 0) {
    return input;
  }

  const promoMap = existingMap || (await getActivePromotionsMap());
  const enriched = rawList.map((doc) => {
    const plain =
      doc && typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    const promo = promoMap.get(String(plain._id)) || null;
    return {
      ...plain,
      activePromotion: promo
        ? {
            _id: promo._id,
            title: promo.title,
            discountPercent: promo.discountPercent,
            expiresAt: promo.expiresAt,
            discountedPrice: computeDiscountedPrice(
              plain.price,
              promo.discountPercent
            ),
          }
        : null,
    };
  });

  return isArray ? enriched : enriched[0];
};

const removeProductFromPromotions = async (productId) => {
  if (!productId) {
    return;
  }
  await Promotion.updateMany(
    { isActive: true, productIds: productId },
    { $pull: { productIds: productId } }
  );
  await Promotion.updateMany(
    { isActive: true, productIds: { $size: 0 } },
    { $set: { isActive: false } }
  );
};

module.exports = {
  computeDiscountedPrice,
  getActivePromotionsMap,
  attachActivePromotions,
  removeProductFromPromotions,
};
