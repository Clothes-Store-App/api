const vnpayService = require('../services/payment.service');
const orderService = require('../services/order.service');

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

  /**
   * Xử lý return URL từ VNPay (khi user quay về từ trang thanh toán)
   */
  processPaymentReturn: async (req, res) => {
    
    try {
      const returnData = req.query;
      if (!returnData || !returnData.vnp_ResponseCode) {
        return res.status(400).send(`
          <html>
            <head><title>Kết quả thanh toán</title></head>
            <body>
              <h2>Dữ liệu thanh toán không hợp lệ!</h2>
              <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
            </body>
          </html>
        `);
      }
      
      const vnp_TxnRef = returnData.vnp_TxnRef;
      
      // Tìm payment record
      const Payment = require('../models').Payment;
      const payment = await Payment.findOne({
        where: { 
          paymentType: 'VNPay',
          orderId: Number(returnData.orderId)
        }
      });
      
      if (payment) {
        // Cập nhật payment với return data
        await payment.update({
          responseData: JSON.stringify({
            ...JSON.parse(payment.responseData || '{}'),
            return: returnData,
            returnTime: new Date().toISOString()
          })
        });
        
        // Xử lý return data
        returnData.orderId = payment.orderId;
        const handleResult = await vnpayService.handleVNPayCallback(returnData);
        
        if (returnData.vnp_ResponseCode === '00') {
          return res.send(`
            <html>
              <head>
                <title>Thanh toán thành công</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  .success { color: #27ae60; }
                  .message { margin: 20px 0; }
                </style>
              </head>
              <body>
                <h2 class="success">✓ Thanh toán thành công!</h2>
                <div class="message">
                  <p>Đơn hàng #${payment.orderId} đã được thanh toán thành công.</p>
                  <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
                </div>
                <script>
                  // Tự động đóng tab sau 3 giây
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </body>
            </html>
          `);
        } else {
          return res.send(`
            <html>
              <head>
                <title>Thanh toán thất bại</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  .error { color: #e74c3c; }
                  .message { margin: 20px 0; }
                </style>
              </head>
              <body>
                <h2 class="error">✗ Thanh toán thất bại</h2>
                <div class="message">
                  <p>Đơn hàng #${payment.order_id} thanh toán thất bại.</p>
                  <p>Vui lòng quay lại ứng dụng để thử lại.</p>
                </div>
                <script>
                  // Tự động đóng tab sau 3 giây
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </body>
            </html>
          `);
        }
      } else {
        return res.send(`
          <html>
            <head><title>Không tìm thấy đơn hàng</title></head>
            <body>
              <h2>Không tìm thấy đơn hàng!</h2>
              <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('[VNPay] processPaymentReturn error:', error);
      return res.status(500).send(`
        <html>
          <head><title>Lỗi xử lý thanh toán</title></head>
          <body>
            <h2>Có lỗi xảy ra!</h2>
            <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
          </body>
        </html>
      `);
    }
  },

  verifyPayment: (req, res) => {
    try {
      const vnpParams = req.query;
      if (!vnpParams || Object.keys(vnpParams).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No payment data provided'
        });
      }
      const result = vnpayService.verifyReturnUrl(vnpParams);
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
      const ipnData = req.query;
      const result = vnpayService.processIpn(ipnData);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[VNPay] processIpn error:', error);
      return res.status(500).json({ RspCode: '99', Message: 'Internal error' });
    }
  },

  handleCallback: async (req, res) => {
    
    try {
      const callbackData = req.query;
      if (!callbackData || !callbackData.vnp_ResponseCode) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu callback không hợp lệ! Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.'
        });
      }
      
      const vnp_TxnRef = callbackData.vnp_TxnRef;
      
      // Tìm payment record bằng transaction reference
      const Payment = require('../models').Payment;
      const payment = await Payment.findOne({
        where: { 
          paymentType: 'VNPay'
        }
      });
      
      let orderId;
      if (payment) {
        orderId = payment.order_id;
        
        // Cập nhật payment với callback data
        await payment.update({
          responseData: JSON.stringify({
            ...JSON.parse(payment.responseData || '{}'),
            callback: callbackData,
            callbackTime: new Date().toISOString()
          })
        });
      
        // Xử lý callback
        callbackData.orderId = orderId;
        const handleResult = await vnpayService.handleVNPayCallback(callbackData);
        
        if (callbackData.vnp_ResponseCode === '00') {
          return res.status(200).json({
            success: true,
            message: 'Thanh toán thành công! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
          });
        } else {
          return res.status(200).json({
            success: false,
            message: 'Thanh toán thất bại hoặc bị hủy! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
          });
        }
      } else {        
        // Thử tìm payment gần nhất nếu không tìm thấy
        const recentPayment = await Payment.findOne({
          where: { paymentType: 'VNPay' },
          order: [['createdAt', 'DESC']]
        });
        
        if (recentPayment) {
          
          // Cập nhật payment với callback data
          await recentPayment.update({
            responseData: JSON.stringify({
              ...JSON.parse(recentPayment.responseData || '{}'),
              callback: callbackData,
              callbackTime: new Date().toISOString()
            })
          });
          
          orderId = recentPayment.order_id;
          callbackData.orderId = orderId;
          const handleResult = await vnpayService.handleVNPayCallback(callbackData);
          
          if (callbackData.vnp_ResponseCode === '00') {
            return res.status(200).json({
              success: true,
              message: 'Thanh toán thành công! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
            });
          } else {
            return res.status(200).json({
              success: false,
              message: 'Thanh toán thất bại hoặc bị hủy! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
            });
          }
        }
        
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng liên quan callback.'
        });
      }
    } catch (error) {
      console.error('[VNPay] handleCallback error:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xử lý thanh toán! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
      });
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

  /**
   * API để app check trạng thái thanh toán
   */
  checkPaymentStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }
      const Payment = require('../models').Payment;
      const Order = require('../models').Order;
      // Tìm payment record
      const payment = await Payment.findOne({
        where: { orderId, paymentType: 'VNPay' },
        order: [['createdAt', 'DESC']]
      });
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      // Tìm order
      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          orderStatus: order.status,
          paymentStatus: payment.status,
          amount: payment.amount,
          paymentType: payment.paymentType,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        }
      });
    } catch (error) {
      console.error('[VNPay] checkPaymentStatus error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * API để test callback thủ công (cho development)
   */
  testCallback: async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      // Tạo mock callback data
      const mockCallbackData = {
        vnp_ResponseCode: '00', // Success
        vnp_TxnRef: `VNP${orderId}${Date.now()}`,
        vnp_Amount: '66000000',
        vnp_OrderInfo: `Thanh toán đơn hàng #${orderId}`,
        vnp_TransactionNo: `VN${Date.now()}`,
        vnp_PayDate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
        orderId: orderId
      };
      
      // Gọi handleVNPayCallback
      const handleResult = await vnpayService.handleVNPayCallback(mockCallbackData);

      return res.status(200).json({
        success: true,
        message: 'Test callback completed',
        data: handleResult
      });

    } catch (error) {
      console.error('[VNPay] testCallback error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error testing callback',
        error: error.message
      });
    }
  }
};

module.exports = paymentController; 