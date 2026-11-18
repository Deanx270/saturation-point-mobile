const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const { sendExpoPushNotifications } = require('../utils/pushNotificationSender');

const sendPromotionalNotification = async (req, res) => {
  try {
    const { title, body, productId, productIds, discountPercent } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
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
      return res.status(400).json({ message: 'Select at least one product to feature.' });
    }

    const matchedProducts = await Product.find({ _id: { $in: uniqueIds } }).select('_id');
    const matchedSet = new Set(matchedProducts.map((p) => p._id.toString()));
    const validIds = uniqueIds.filter((id) => matchedSet.has(id));

    if (validIds.length === 0) {
      return res.status(404).json({ message: 'Selected products could not be found.' });
    }

    const parsedDiscount = Number(discountPercent) || 0;
    const notificationData =
      validIds.length === 1
        ? {
            screen: 'ProductDetails',
            productId: validIds[0],
            discountPercent: parsedDiscount,
            promoTitle: title,
          }
        : {
            screen: 'ProductList',
            productIds: validIds,
            discountPercent: parsedDiscount,
            promoTitle: title,
          };

    const usersWithTokens = await User.find({
      'pushTokens.0': { $exists: true },
    });

    const messages = [];

    for (const user of usersWithTokens) {
      for (const tokenItem of user.pushTokens) {
        messages.push({
          to: tokenItem.token,
          title,
          body,
          data: notificationData,
        });
      }
    }

    const tickets = await sendExpoPushNotifications(messages);

    res.json({
      message: `Promotional push notification dispatched to ${messages.length} device(s)`,
      dispatchedCount: messages.length,
      tickets,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendPromotionalNotification,
};
