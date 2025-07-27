const { Expo } = require('expo-server-sdk');
const { User } = require('../models');
const { Op } = require('sequelize');

// Khởi tạo instance của Expo SDK
const expo = new Expo();

// Lưu trữ push tokens của tất cả users (không chỉ admin)
let userPushTokens = new Map();

const NotificationService = {
  // Lưu push token cho bất kỳ user nào (không chỉ admin)
  saveUserPushToken: async (userId, pushToken) => {
    try {
      console.log(`💾 Saving push token for user ${userId}`);

      const user = await User.findByPk(userId);
      if (!user) {
        console.log(`❌ User ${userId} not found`);
        return false;
      }

      await user.update({ push_token: pushToken });
      console.log(`✅ Push token saved for user ${userId}`);

      // Cập nhật cache
      userPushTokens.set(userId, pushToken);
      console.log(`📱 Updated cache for user ${userId}`);

      return true;
    } catch (error) {
      console.error(`❌ Error saving push token for user ${userId}:`, error);
      return false;
    }
  },

  // Xóa push token của user
  removeUserPushToken: async (userId) => {
    try {
      await User.update(
        { push_token: null },
        { where: { id: userId } }
      );

      userPushTokens.delete(userId);
      console.log(`✅ Push token removed for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error removing push token:', error);
      throw error;
    }
  },

  // Load tất cả push tokens từ database
  loadUserPushTokens: async () => {
    try {
      console.log('📋 Loading user push tokens from database...');
      const users = await User.findAll({
        where: {
          push_token: {
            [Op.not]: null
          }
        },
        attributes: ['id', 'push_token']
      });

      users.forEach(user => {
        console.log(`  User ${user.id}: ${user.push_token}`);
      });

      const tokens = new Map();
      users.forEach(user => {
        tokens.set(user.id, user.push_token);
      });

      return tokens;
    } catch (error) {
      console.error('❌ Error loading user push tokens:', error);
      return new Map();
    }
  },

  // Gửi thông báo cho tất cả users (không chỉ admin)
  sendNotificationToUsers: async (title = 'test title', body = 'body test', data = {}) => {
    try {
      // Tạo messages cho tất cả user tokens
      const messages = [];
      for (const [userId, pushToken] of userPushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
          console.error(`Invalid Expo push token ${pushToken}`);
          continue;
        }

        messages.push({
          to: pushToken,
          sound: 'default',
          title,
          body,
          data: { ...data, userId },
          badge: 1,
          priority: 'high',
        });
      }

      console.log(`📱 Sending notifications to ${messages.length} users`);

      // Chia thành chunks và gửi
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending chunk:', error);
        }
      }

      return tickets;
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  },

  // Gửi thông báo cho một user cụ thể
  sendNotificationToUser: async (userId, title, body, data = {}) => {
    try {
      // Load tokens từ database
      const tokens = await NotificationService.loadUserPushTokens();

      const userToken = tokens.get(userId);

      if (!userToken) {
        console.log(`⚠️ No push token found for user ${userId}`);
        return false;
      }

      const message = {
        to: userToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        badge: 1
      };


      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      const result = await response.json();

      if (response.ok && result.data) {
        console.log(`✅ Notification sent successfully to user ${userId}`);
        return true;
      } else {
        console.log(`❌ Failed to send notification to user ${userId}:`, result);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error sending notification to user ${userId}:`, error);
      return false;
    }
  },

  // Gửi thông báo cho admin users (giữ lại cho backward compatibility)
  sendNotificationToAdmins: async (title = 'test title', body = 'body test', data = {}) => {
    try {
      // Lấy tất cả admin users có push token
      const adminUsers = await User.findAll({
        where: {
          role: 'ROLE_ADMIN',
          push_token: {
            [Op.not]: null
          }
        }
      });

      const messages = [];
      adminUsers.forEach(user => {
        if (Expo.isExpoPushToken(user.push_token)) {
          messages.push({
            to: user.push_token,
            sound: 'default',
            title,
            body,
            data: { ...data, userId: user.id },
            badge: 1,
            priority: 'high',
          });
        }
      });

      console.log(`📱 Sending notifications to ${messages.length} admins`);

      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending chunk:', error);
        }
      }

      return tickets;
    } catch (error) {
      console.error('Error sending notifications to admins:', error);
      throw error;
    }
  },

  // Kiểm tra trạng thái của các notification tickets
  checkNotificationStatus: async (tickets) => {
    try {
      const receiptIds = [];
      for (const ticket of tickets) {
        if (ticket.id) {
          receiptIds.push(ticket.id);
        }
      }

      const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
      const receipts = [];

      for (const chunk of receiptIdChunks) {
        try {
          const receipt = await expo.getPushNotificationReceiptsAsync(chunk);
          receipts.push(receipt);
        } catch (error) {
          console.error('Error checking receipts:', error);
        }
      }

      return receipts;
    } catch (error) {
      console.error('Error checking notification status:', error);
      throw error;
    }
  },

};

module.exports = NotificationService; 