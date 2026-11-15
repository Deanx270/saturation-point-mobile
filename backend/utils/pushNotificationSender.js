const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const sendExpoPushNotifications = async (messages) => {
  const preparedMessages = [];

  for (const message of messages) {
    if (!Expo.isExpoPushToken(message.to)) {
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

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error dispatching push notification chunk:', error);
    }
  }

  return tickets;
};

module.exports = {
  sendExpoPushNotifications,
};
