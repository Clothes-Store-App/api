const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const NotificationService = require('../services/notification.service');
const sendResponse = require('../utils/responseFormatter');
const { STATUS } = require('../constants/httpStatusCodes');
const { MESSAGE } = require('../constants/messages');

// Đăng ký push token
router.post('/register-token', auth, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    if (!pushToken) {
      console.log(`❌ No push token provided`);
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    const result = await NotificationService.saveUserPushToken(userId, pushToken);

    if (result) {
      console.log(`✅ Token registered successfully for user ${userId}`);
      res.json({
        success: true,
        message: 'Push token registered successfully'
      });
    } else {
      console.log(`❌ Failed to register token for user ${userId}`);
      res.status(500).json({
        success: false,
        message: 'Failed to register push token'
      });
    }
  } catch (error) {
    console.error('❌ Error in register token route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Hủy đăng ký push token cho bất kỳ user nào
router.post('/unregister-token', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📱 Unregistering push token for user ${userId}`);
    await NotificationService.removeUserPushToken(userId);
    
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.UPDATED);
  } catch (error) {
    console.error('Error unregistering push token:', error);
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
});

module.exports = router; 