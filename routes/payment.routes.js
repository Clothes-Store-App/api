const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyToken } = require('../middleware/auth');

// Tạo URL thanh toán VNPay
router.post('/create', verifyToken, paymentController.createPayment);

// Xử lý kết quả thanh toán từ VNPay
router.get('/vnpay-return', paymentController.processPaymentReturn);

// Xác thực thanh toán (cho client)
router.get('/verify', paymentController.verifyPayment);

// Xử lý IPN từ VNPay
router.get('/vnpay-ipn', paymentController.processIpn);

// Xử lý callback từ VNPay
router.get('/vnpay-callback', paymentController.handleCallback);

// Kiểm tra trạng thái thanh toán
router.get('/status/:orderId', verifyToken, paymentController.checkPaymentStatus);

module.exports = router; 