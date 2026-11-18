const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendExpoPushNotifications } = require('../utils/pushNotificationSender');

const createOrder = async (req, res) => {
  try {
    const { orderItems, totalAmount, paymentMethod, shippingAddress } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    if (paymentMethod && paymentMethod !== 'Cash on Delivery') {
      return res.status(400).json({ message: 'Only Cash on Delivery is supported' });
    }

    const street = typeof shippingAddress?.street === 'string' ? shippingAddress.street.trim() : '';
    const city = typeof shippingAddress?.city === 'string' ? shippingAddress.city.trim() : '';
    const postalCode = typeof shippingAddress?.postalCode === 'string' ? shippingAddress.postalCode.trim() : '';
    const country = typeof shippingAddress?.country === 'string' ? shippingAddress.country.trim() : '';

    if (street.length < 5 || !/[a-zA-Z]/.test(street)) {
      return res.status(400).json({ message: 'Please provide a valid street address' });
    }
    if (city.length < 2 || !/^[a-zA-Z\s.\-']+$/.test(city)) {
      return res.status(400).json({ message: 'Please provide a valid city name' });
    }
    if (!/^\d{4,10}$/.test(postalCode)) {
      return res.status(400).json({ message: 'Postal code must contain 4 to 10 digits' });
    }
    if (country.length < 2 || !/^[a-zA-Z\s.\-']+$/.test(country)) {
      return res.status(400).json({ message: 'Please provide a valid country name' });
    }

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.name}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });
      }
    }

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      totalAmount,
      paymentMethod: 'Cash on Delivery',
      shippingAddress: {
        street,
        city,
        postalCode,
        country,
      },
      status: 'pending',
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'displayName email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'displayName email photoURL')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ALLOWED_STATUS_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const VALID_ORDER_STATUSES = Object.keys(ALLOWED_STATUS_TRANSITIONS);

const restoreOrderItemStock = async (order) => {
  for (const item of order.orderItems || []) {
    if (item.product && item.quantity > 0) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }
  }
};

const cancelMyOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'displayName email photoURL'
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const ownerId = order.user?._id ? order.user._id.toString() : String(order.user || '');
    if (ownerId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const currentStatus = String(order.status || 'pending').toLowerCase();
    if (currentStatus !== 'pending') {
      return res.status(400).json({
        message: 'Only pending orders can be cancelled.',
      });
    }

    await restoreOrderItemStock(order);
    order.status = 'cancelled';
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const nextStatus = typeof req.body.status === 'string'
      ? req.body.status.trim().toLowerCase()
      : '';

    if (!VALID_ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid order status value' });
    }

    const order = await Order.findById(req.params.id).populate(
      'user',
      'displayName email photoURL'
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const currentStatus = String(order.status || 'pending').toLowerCase();

    if (currentStatus === nextStatus) {
      return res.status(400).json({
        message: `Order is already marked as ${currentStatus}.`,
      });
    }

    if (currentStatus === 'delivered') {
      return res.status(400).json({
        message: 'Delivered orders are completed and can no longer be modified.',
      });
    }

    if (currentStatus === 'cancelled') {
      return res.status(400).json({
        message: 'Cancelled orders are closed and cannot be changed.',
      });
    }

    const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      if (nextStatus === 'cancelled' && currentStatus === 'shipped') {
        return res.status(400).json({
          message: 'Orders that have already shipped cannot be cancelled.',
        });
      }
      return res.status(400).json({
        message: `Cannot change status from ${currentStatus} to ${nextStatus}. Allowed next step: ${allowedNext.join(' or ')}.`,
      });
    }

    if (nextStatus === 'cancelled') {
      await restoreOrderItemStock(order);
    }

    order.status = nextStatus;
    if (nextStatus === 'delivered') {
      order.deliveredAt = new Date();
    }
    await order.save();

    const recipientId = order.user?._id || order.user;
    const recipient = recipientId ? await User.findById(recipientId) : null;
    if (recipient && recipient.pushTokens && recipient.pushTokens.length > 0) {
      const formattedNextStatus =
        `${nextStatus.charAt(0).toUpperCase()}${nextStatus.slice(1).toLowerCase()}`;
      const messages = recipient.pushTokens.map((item) => ({
        to: item.token,
        title: 'Order Status Update',
        body: `Your order #${order._id.toString().slice(-6)} is now ${formattedNextStatus}.`,
        data: {
          screen: 'OrderDetails',
          orderId: order._id.toString(),
        },
      }));
      Promise.resolve(sendExpoPushNotifications(messages)).catch(() => {});
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelMyOrder,
};
