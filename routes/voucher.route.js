const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher.controller');
const { BASE_ENDPOINT, VOUCHER_ENDPOINT } = require('../constants/endpoints');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');
// CRUD
router.post(BASE_ENDPOINT.BASE, auth, isAdmin, voucherController.createVoucher);
router.get(VOUCHER_ENDPOINT.AVAILABLE, voucherController.getAvailableVouchers);
router.get(BASE_ENDPOINT.BASE, auth, isAdmin, voucherController.getAllVouchers);
router.get(BASE_ENDPOINT.BY_ID, voucherController.getVoucherById);
router.put(BASE_ENDPOINT.BY_ID, auth, isAdmin, voucherController.updateVoucher);
router.delete(BASE_ENDPOINT.BY_ID, auth, isAdmin, voucherController.deleteVoucher);

// Apply voucher
router.post(VOUCHER_ENDPOINT.APPLY, auth, voucherController.applyVoucher);

module.exports = router; 