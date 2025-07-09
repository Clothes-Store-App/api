const cartService = require('../services/cart.service');
const sendResponse = require('../utils/responseFormatter');
const { MESSAGE } = require('../constants/messages');
const { STATUS } = require('../constants/httpStatusCodes');

class CartController {
  async addToCart(req, res) {
    try {
      const userId = req.user.id;
      const productData = {
        product_id: parseInt(req.body.product_id),
        product_color_id: parseInt(req.body.product_color_id),
        product_size_id: parseInt(req.body.product_size_id),
        quantity: parseInt(req.body.quantity) || 1,
        price: parseFloat(req.body.price)
      };
      const cartItem = await cartService.addToCart(userId, productData);
      sendResponse(res, STATUS.CREATED, MESSAGE.SUCCESS.CREATED, cartItem);
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message || MESSAGE.ERROR.INTERNAL, null, false, error);
    }
  }

  async getCart(req, res) {
    try {
      const userId = req.user.id;
      const cart = await cartService.getCartItems(userId);
      sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, cart);
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message || MESSAGE.ERROR.INTERNAL, null, false, error);
    }
  }

  async updateCartItemQuantity(req, res) {
    try {
      const userId = req.user.id;
      const cartItemId = parseInt(req.params.id);
      const quantity = parseInt(req.body.quantity);

      if (isNaN(quantity) || quantity < 0) {
        return sendResponse(res, STATUS.BAD_REQUEST, MESSAGE.ERROR.INVALID_DATA, null, false);
      }

      const cartItem = await cartService.updateCartItemQuantity(userId, cartItemId, quantity);
      sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.UPDATED, cartItem);
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message || MESSAGE.ERROR.INTERNAL, null, false, error);
    }
  }

  async removeFromCart(req, res) {
    try {
      const userId = req.user.id;
      const cartItemId = parseInt(req.params.id);

      await cartService.removeFromCart(userId, cartItemId);
      sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.DELETED);
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message || MESSAGE.ERROR.INTERNAL, null, false, error);
    }
  }

  async clearCart(req, res) {
    try {
      const userId = req.user.id;
      await cartService.clearCart(userId);
      sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.DELETED);
    } catch (error) {
      sendResponse(res, STATUS.SERVER_ERROR, error.message || MESSAGE.ERROR.INTERNAL, null, false, error);
    }
  }
}

module.exports = new CartController(); 