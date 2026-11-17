const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

const expo = new Expo();
const RECEIPT_CHECK_DELAY_MS = 15000;

const pruneStalePushTokens = async (tokens) => {
  const uniqueTokens = Array.from(
    new Set((tokens || []).filter((token) => typeof token === 'string' && token.trim()))
  );
  if (uniqueTokens.length === 0) {
    return;
  }

  try {
    await User.updateMany(
      { 'pushTokens.token': { $in: uniqueTokens } },
      { $pull: { pushTokens: { token: { $in: uniqueTokens } } } }
    );
  } catch (error) {
    console.error('Error removing stale push tokens:', error);
  }
};

const scheduleReceiptVerification = (receiptTokenMap) => {
  if (!receiptTokenMap || receiptTokenMap.size === 0) {
    return;
  }

  const timer = setTimeout(async () => {
    try {
      const receiptIds = Array.from(receiptTokenMap.keys());
      const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
      const staleReceiptTokens = [];

      for (const idChunk of receiptIdChunks) {
        try {
          const receipts = await expo.getPushNotificationReceiptsAsync(idChunk);
          for (const [receiptId, receipt] of Object.entries(receipts || {})) {
            if (
              receipt?.status === 'error' &&
              receipt?.details?.error === 'DeviceNotRegistered'
            ) {
              const failedToken = receiptTokenMap.get(receiptId);
              if (failedToken) {
                staleReceiptTokens.push(failedToken);
              }
            }
          }
        } catch (chunkError) {
          console.error('Error retrieving push notification receipts:', chunkError);
        }
      }

      if (staleReceiptTokens.length > 0) {
        await pruneStalePushTokens(staleReceiptTokens);
      }
    } catch (error) {
      console.error('Error verifying push notification receipts:', error);
    }
  }, RECEIPT_CHECK_DELAY_MS);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }
};

const sendExpoPushNotifications = async (messages) => {
  const preparedMessages = [];
  const staleTokens = new Set();

  for (const message of messages) {
    if (!Expo.isExpoPushToken(message.to)) {
      if (typeof message.to === 'string' && message.to.trim()) {
        staleTokens.add(message.to);
      }
      continue;
    }

    preparedMessages.push({
      to: message.to,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data || {},
      badge: 1,
      priority: 'high',
    });
  }

  const chunks = expo.chunkPushNotifications(preparedMessages);
  const tickets = [];
  const receiptTokenMap = new Map();

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);

      ticketChunk.forEach((ticket, index) => {
        const targetToken = typeof chunk[index]?.to === 'string' ? chunk[index].to : null;
        if (!targetToken) {
          return;
        }
        if (
          ticket?.status === 'error' &&
          ticket?.details?.error === 'DeviceNotRegistered'
        ) {
          staleTokens.add(targetToken);
        } else if (ticket?.status === 'ok' && ticket?.id) {
          receiptTokenMap.set(ticket.id, targetToken);
        }
      });
    } catch (error) {
      console.error('Error dispatching push notification chunk:', error);
    }
  }

  if (staleTokens.size > 0) {
    await pruneStalePushTokens(Array.from(staleTokens));
  }

  if (receiptTokenMap.size > 0) {
    scheduleReceiptVerification(receiptTokenMap);
  }

  return tickets;
};

module.exports = {
  sendExpoPushNotifications,
  pruneStalePushTokens,
};
