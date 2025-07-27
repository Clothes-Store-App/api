const voucherService = require('../services/voucher.service');
const sendResponse = require('../utils/responseFormatter');
const { MESSAGE } = require('../constants/messages');
const { STATUS } = require('../constants/httpStatusCodes');

const createVoucher = async (req, res) => {
  try {
    const voucher = await voucherService.createVoucher(req.body);
    sendResponse(res, STATUS.CREATED, MESSAGE.SUCCESS.CREATED, voucher);
  } catch (error) {
    sendResponse(res, STATUS.BAD_REQUEST, error.message, null, false, error);
  }
};

const getAllVouchers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const vouchers = await voucherService.getAllVouchers({ page, limit, search });
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, vouchers);
  } catch (error) {
    sendResponse(res, STATUS.SERVER_ERROR, MESSAGE.ERROR.INTERNAL, null, false, error);
  }
};

const getVoucherById = async (req, res) => {
  try {
    const voucher = await voucherService.getVoucherById(req.params.id);
    if (!voucher) return sendResponse(res, STATUS.NOT_FOUND, MESSAGE.ERROR.NOT_FOUND, null, false);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, voucher);
  } catch (error) {
    sendResponse(res, STATUS.SERVER_ERROR, MESSAGE.ERROR.INTERNAL, null, false, error);
  }
};

const updateVoucher = async (req, res) => {
  try {
    const voucher = await voucherService.updateVoucher(req.params.id, req.body);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.UPDATED, voucher);
  } catch (error) {
    sendResponse(res, STATUS.BAD_REQUEST, error.message, null, false, error);
  }
};

const deleteVoucher = async (req, res) => {
  try {
    await voucherService.deleteVoucher(req.params.id);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.DELETED);
  } catch (error) {
    sendResponse(res, STATUS.BAD_REQUEST, error.message, null, false, error);
  }
};

const applyVoucher = async (req, res) => {
  try {
    const voucher = await voucherService.applyVoucher(req.body.code);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, voucher);
  } catch (error) {
    sendResponse(res, STATUS.BAD_REQUEST, error.message, null, false, error);
  }
};

const getAvailableVouchers = async (req, res) => {
  try {
    const vouchers = await voucherService.getAvailableVouchers();
    
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, vouchers);
  } catch (error) {
    sendResponse(res, STATUS.SERVER_ERROR, MESSAGE.ERROR.INTERNAL, null, false, error);
  }
};

module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  applyVoucher,
  getAvailableVouchers
}; 