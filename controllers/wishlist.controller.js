const wishlistService = require('../services/wishlist.service');
const sendResponse = require('../utils/responseFormatter');
const { MESSAGE } = require('../constants/messages');
const { STATUS } = require('../constants/httpStatusCodes');

const wishlistController = {
  async add(req, res) {
    try {
      const userId = req.user?.id || req.body.userId;
      
      const { productId } = req.body;
      if (!userId || !productId)
        return sendResponse(res, STATUS.BAD_REQUEST, 'Missing userId or productId', null, false);
      const item = await wishlistService.addToWishlist(userId, productId);
      sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.CREATED, item);
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message, null, false, error);
    }
  },

  async remove(req, res) {
    try {
      const userId = req.user?.id || req.body.userId;
      const { productId } = req.body;
      if (!userId || !productId)
        return sendResponse(res, STATUS.BAD_REQUEST, 'Missing userId or productId', null, false);
      await wishlistService.removeFromWishlist(userId, productId);
      sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.DELETED);
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message, null, false, error);
    }
  },

  async getAll(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      console.log('userId:', userId);
      
      if (!userId)
        return sendResponse(res, STATUS.BAD_REQUEST, 'Missing userId', null, false);
      const items = await wishlistService.getUserWishlist(userId);
      sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, items);
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message, null, false, error);
    }
  },

  async check(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      const { productId } = req.query;
      if (!userId || !productId)
        return sendResponse(res, STATUS.BAD_REQUEST, 'Missing userId or productId', null, false);
      const exists = await wishlistService.isInWishlist(userId, productId);
      sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, { exists });
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message, null, false, error);
    }
  }
};

module.exports = wishlistController; 