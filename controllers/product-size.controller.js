const productSizeService = require("../services/product-size.service");
const sendResponse = require("../utils/responseFormatter");
const { MESSAGE } = require("../constants/messages");
const { STATUS } = require("../constants/httpStatusCodes");

const getAll = async (req, res) => {
  try {
    const sizes = await productSizeService.getAllSizes();
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, sizes);
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

const show = async (req, res) => {
  try {
    const sizeId = req.params.id;
    const size = await productSizeService.getSizeById(sizeId);
    if (!size) {
      return sendResponse(res, STATUS.NOT_FOUND, MESSAGE.ERROR.NOT_FOUND);
    }
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, size);
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

const create = async (req, res) => {
  try {
    const size = await productSizeService.createSize(req.body);
    sendResponse(res, STATUS.CREATED, MESSAGE.SUCCESS.CREATED, size);
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

const update = async (req, res) => {
  try {
    const sizeId = req.params.id;
    const updatedSize = await productSizeService.updateSize(sizeId, req.body);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.UPDATED, updatedSize);
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

const remove = async (req, res) => {
  try {
    const sizeId = req.params.id;
    await productSizeService.deleteSize(sizeId);
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

const ApiProductSizeController = {
  getAll,
  show,
  create,
  update,
  remove
};

module.exports = ApiProductSizeController; 