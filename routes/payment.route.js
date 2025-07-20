const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { VNPAY_ENDPOINT } = require('../constants/endpoints');

router.post(VNPAY_ENDPOINT.CREATE_PAYMENT_URL, paymentController.createPayment);
router.get(VNPAY_ENDPOINT.VERIFY_RETURN_URL, paymentController.checkPaymentStatus);
router.get(VNPAY_ENDPOINT.PROCESS_IPN, paymentController.processIpn);
router.get(VNPAY_ENDPOINT.HANDLE_CALLBACK, paymentController.handleCallback);
router.get('/vnpay-return', paymentController.processPaymentReturn);
router.get('/payment-success', paymentController.paymentSuccessPage);

module.exports = router; 