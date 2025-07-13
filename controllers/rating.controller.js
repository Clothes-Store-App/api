const ratingService = require("../services/rating.service");
const sendResponse = require("../utils/responseFormatter");
const { MESSAGE } = require("../constants/messages");
const { STATUS } = require("../constants/httpStatusCodes");

const createRating = async (req, res) => {
  try {
    const { product_id, star, text } = req.body;
    const user_id = req.user.id; // Lấy từ auth middleware
    
    const ratingData = {
      user_id,
      product_id,
      star,
      text
    };
    
    const newRating = await ratingService.createRating(ratingData);
    sendResponse(res, STATUS.CREATED, MESSAGE.SUCCESS.CREATED, newRating);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const updateRating = async (req, res) => {
  try {
    const ratingId = req.params.id;
    const userId = req.user.id;
    const { star, text } = req.body;
    
    const ratingData = { star, text };
    
    const updatedRating = await ratingService.updateRating(ratingId, ratingData, userId);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.UPDATED, updatedRating);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const deleteRating = async (req, res) => {
  try {
    const ratingId = req.params.id;
    const userId = req.user.id;
    
    await ratingService.deleteRating(ratingId, userId);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.DELETED);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const getRatingsByProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const result = await ratingService.getRatingsByProduct(productId);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, result);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const getRatingsByUser = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ auth middleware
    
    const result = await ratingService.getRatingsByUser(userId);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, result);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const getProductRatingStats = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const stats = await ratingService.getProductRatingStats(productId);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, stats);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const getAllRatings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    
    const result = await ratingService.getAllRatings(page, limit, search);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, result);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const ApiRatingController = {
  createRating,
  updateRating,
  deleteRating,
  getRatingsByProduct,
  getRatingsByUser,
  getProductRatingStats,
  getAllRatings
};

module.exports = ApiRatingController; 