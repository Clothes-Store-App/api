const vnpayService = require('../services/payment.service');
const moment = require('moment');

/**
 * Controller xử lý các request liên quan đến VNPay
 */
const paymentController = {
  /**
   * Tạo URL thanh toán VNPay cho đơn hàng đã có sẵn
   */
  createPayment: async (req, res) => {
    try {
      console.log('[VNPay] createPayment req.body:', req.body);
      const {
        orderId,
        amount,
        orderInfo,
        userId,
        ipAddr,
        bankCode = '',
        orderType = 'billpayment',
        language = 'vn'
      } = req.body;
      // Lấy IP nếu không truyền
      const clientIp = ipAddr || req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';
      const paymentData = {
        orderId,
        amount,
        orderInfo,
        userId,
        ipAddr: clientIp,
        bankCode,
        orderType,
        language
      };
      const result = await vnpayService.createPaymentUrl(paymentData);
      console.log('[VNPay] createPayment result:', result);
      if (result.success) {
        return res.status(200).json({
          success: true,
          orderId: result.orderId,
          vnpTxnRef: result.vnpTxnRef,
          paymentUrl: result.paymentUrl
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message || 'Không thể tạo URL thanh toán'
        });
      }
    } catch (error) {
      console.error('[VNPay] createPayment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống'
      });
    }
  },

  processPaymentReturn: (req, res) => {
    try {
      console.log('[VNPay] processPaymentReturn req.query:', req.query);
      const vnpParams = req.query;
      const result = vnpayService.verifyReturnUrl(vnpParams);
      console.log('[VNPay] processPaymentReturn result:', result);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[VNPay] processPaymentReturn error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  verifyPayment: (req, res) => {
    try {
      console.log('[VNPay] verifyPayment req.query:', req.query);
      const vnpParams = req.query;
      if (!vnpParams || Object.keys(vnpParams).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No payment data provided'
        });
      }
      const result = vnpayService.verifyReturnUrl(vnpParams);
      console.log('[VNPay] verifyPayment result:', result);
      return res.status(200).json({
        ...vnpParams,
        vnp_Amount: parseInt(vnpParams.vnp_Amount) / 100,
        success: result.isValid && result.isSuccessful,
        message: result.isValid 
          ? (result.isSuccessful ? 'Payment success' : 'Payment failed')
          : 'Invalid payment data'
      });
    } catch (error) {
      console.error('[VNPay] verifyPayment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  processIpn: (req, res) => {
    try {
      console.log('[VNPay] processIpn req.query:', req.query);
      const ipnData = req.query;
      const result = vnpayService.processIpn(ipnData);
      console.log('[VNPay] processIpn result:', result);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[VNPay] processIpn error:', error);
      return res.status(500).json({ RspCode: '99', Message: 'Internal error' });
    }
  },

  handleCallback: async (req, res) => {
    try {
      console.log('[VNPay] handleCallback req.query:', req.query);
      const callbackData = req.query;
      if (!callbackData || !callbackData.vnp_ResponseCode) {
        return res.send(`
          <html>
            <head><title>Lỗi thanh toán</title></head>
            <body>
              <h2>Dữ liệu callback không hợp lệ!</h2>
              <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
            </body>
          </html>
        `);
      }
      const vnp_TxnRef = callbackData.vnp_TxnRef;
      const Payment = require('../models').Payment;
      const payment = await Payment.findOne({
        where: { paymentType: 'VNPay' },
        order: [['createdAt', 'DESC']]
      });
      let orderId;
      if (payment) {
        orderId = payment.orderId;
        await payment.update({
          responseData: JSON.stringify({
            ...JSON.parse(payment.responseData || '{}'),
            callback: callbackData
          })
        });
      }
      if (orderId) {
        callbackData.orderId = orderId;
        const handleResult = await vnpayService.handleVNPayCallback(callbackData);
        console.log('[VNPay] handleCallback handleVNPayCallback result:', handleResult);
      }
      const isSuccess = callbackData.vnp_ResponseCode === '00';
      if (isSuccess) {
        return res.send(`
          <html>
            <head><title>Thanh toán thành công</title></head>
            <body>
              <h2>Thanh toán thành công!</h2>
              <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
            </body>
          </html>
        `);
      } else {
        return res.send(`
          <html>
            <head><title>Thanh toán thất bại</title></head>
            <body>
              <h2>Thanh toán thất bại hoặc bị hủy!</h2>
              <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('[VNPay] handleCallback error:', error);
      return res.send(`
        <html>
          <head><title>Lỗi thanh toán</title></head>
          <body>
            <h2>Có lỗi xảy ra khi xử lý thanh toán!</h2>
            <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
          </body>
        </html>
      `);
    }
  },

  /**
   * Trang thông báo kết quả thanh toán cho user (dùng cho local/web)
   */
  paymentSuccessPage: async (req, res) => {
    try {
      const { orderId } = req.query;
      if (!orderId) {
        return res.send(`
          <html>
            <head><title>Kết quả thanh toán</title></head>
            <body>
              <h2>Thiếu thông tin đơn hàng!</h2>
              <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
            </body>
          </html>
        `);
      }
      const orderService = require('../services/order.service');
      const result = await orderService.checkPaymentStatus(orderId);
      const isSuccess = result.success;
      res.send(`
        <html>
          <head><title>Kết quả thanh toán</title></head>
          <body>
            <h2>${isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại!'}</h2>
            <p>Đơn hàng #${orderId}</p>
            <p>Vui lòng quay lại ứng dụng để kiểm tra trạng thái đơn hàng.</p>
          </body>
        </html>
      `);
    } catch (error) {
      res.send(`
        <html>
          <head><title>Lỗi thanh toán</title></head>
          <body>
            <h2>Có lỗi xảy ra khi kiểm tra trạng thái đơn hàng!</h2>
            <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
          </body>
        </html>
      `);
    }
  },

  checkPaymentStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin đơn hàng'
        });
      }
      const orderService = require('../services/order.service');
      const result = await orderService.checkPaymentStatus(orderId);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra trạng thái thanh toán'
      });
    }
  }
};

module.exports = paymentController; 