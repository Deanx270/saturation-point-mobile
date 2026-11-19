const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const { sendExpoPushNotifications } = require('../utils/pushNotificationSender');

const sendPromotionalNotification = async (req, res) => {
  try {
    const {
      title,
      body,
      productId,
      productIds,
      discountPercent,
      durationDays,
      expiresAt,
    } = req.body;

    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanBody = typeof body === 'string' ? body.trim() : '';

    if (!cleanTitle || !cleanBody) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const parsedDiscount = Number(discountPercent);
    if (
      Number.isNaN(parsedDiscount) ||
      parsedDiscount < 1 ||
      parsedDiscount > 99
    ) {
      return res
        .status(400)
        .json({ message: 'Discount percentage must be between 1 and 99' });
    }

    const rawIds = Array.isArray(productIds)
      ? productIds
      : productId
      ? [productId]
      : [];

    const uniqueIds = Array.from(
      new Set(
        rawIds
          .map((id) => String(id || '').trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );

    if (uniqueIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'Select at least one product to feature.' });
    }

    const matchedProducts = await Product.find({ _id: { $in: uniqueIds } }).select(
      '_id'
    );
    const matchedSet = new Set(matchedProducts.map((p) => p._id.toString()));
    const validIds = uniqueIds.filter((id) => matchedSet.has(id));

    if (validIds.length === 0) {
      return res
        .status(404)
        .json({ message: 'Selected products could not be found.' });
    }

    let resolvedExpiresAt = null;
    if (expiresAt) {
      const candidate = new Date(expiresAt);
      if (Number.isNaN(candidate.getTime()) || candidate <= new Date()) {
        return res
          .status(400)
          .json({ message: 'Expiration date must be a valid future date' });
      }
      resolvedExpiresAt = candidate;
    } else {
      const days =
        durationDays !== undefined && durationDays !== ''
          ? Number(durationDays)
          : 7;
      if (Number.isNaN(days) || days < 1 || days > 90) {
        return res
          .status(400)
          .json({ message: 'Campaign duration must be between 1 and 90 days' });
      }
      resolvedExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const validObjectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));

    await Promotion.updateMany(
      {
        isActive: true,
        productIds: { $in: validObjectIds },
      },
      {
        $pull: { productIds: { $in: validObjectIds } },
      }
    );

    await Promotion.updateMany(
      {
        isActive: true,
        productIds: { $size: 0 },
      },
      {
        $set: { isActive: false },
      }
    );

    const promotion = await Promotion.create({
      title: cleanTitle,
      body: cleanBody,
      discountPercent: Math.round(parsedDiscount),
      productIds: validObjectIds,
      expiresAt: resolvedExpiresAt,
      isActive: true,
      createdBy: req.user._id,
    });

    const notificationData =
      validIds.length === 1
        ? {
            screen: 'ProductDetails',
            productId: validIds[0],
            promotionId: String(promotion._id),
            discountPercent: promotion.discountPercent,
            promoTitle: promotion.title,
            expiresAt: promotion.expiresAt.toISOString(),
          }
        : {
            screen: 'ProductList',
            productIds: validIds,
            promotionId: String(promotion._id),
            discountPercent: promotion.discountPercent,
            promoTitle: promotion.title,
            expiresAt: promotion.expiresAt.toISOString(),
          };

    const usersWithTokens = await User.find({
      'pushTokens.0': { $exists: true },
    });

    const messages = [];

    for (const user of usersWithTokens) {
      for (const tokenItem of user.pushTokens) {
        messages.push({
          to: tokenItem.token,
          title: promotion.title,
          body: promotion.body,
          data: notificationData,
        });
      }
    }

    const tickets = await sendExpoPushNotifications(messages);

    res.status(201).json({
      message: `Promotion saved and dispatched to ${messages.length} device(s)`,
      dispatchedCount: messages.length,
      promotion,
      tickets,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActivePromotions = async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      isActive: true,
      expiresAt: { $gt: now },
      'productIds.0': { $exists: true },
    })
      .populate('productIds', 'name brand price images')
      .sort({ createdAt: -1 });

    const sanitized = promotions
      .map((promo) => {
        const plain = promo.toObject();
        const validProducts = Array.isArray(plain.productIds)
          ? plain.productIds.filter((item) => item && item._id)
          : [];
        return {
          ...plain,
          products: validProducts,
          productIds: validProducts.map((item) => item._id),
        };
      })
      .filter((promo) => promo.productIds.length > 0);

    const uniqueProductIds = new Set();
    sanitized.forEach((promo) => {
      promo.productIds.forEach((id) => uniqueProductIds.add(String(id)));
    });

    res.json({
      promotions: sanitized,
      activeProductCount: uniqueProductIds.size,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deactivatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    promotion.isActive = false;
    await promotion.save();
    res.json({ message: 'Promotion ended successfully', promotionId: promotion._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendPromotionalNotification,
  getActivePromotions,
  deactivatePromotion,
};
