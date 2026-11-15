const User = require('../models/User');
const Product = require('../models/Product');
const { sendExpoPushNotifications } = require('../utils/pushNotificationSender');

const sendPromotionalNotification = async (req, res) => {
  try {
    const { title, body, productId, discountPercent } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    let targetProduct = null;
    if (productId) {
      targetProduct = await Product.findById(productId);
    }

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
          data: {
            screen: 'ProductDetails',
            productId: targetProduct ? targetProduct._id.toString() : '',
            discountPercent: discountPercent || 0,
          },
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
