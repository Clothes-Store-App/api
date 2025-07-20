const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const { Payment, Order } = require('../models');

class VNPayService {
  constructor() {
    this.vnp_TmnCode = process.env.VNP_TMN_CODE;
    this.vnp_HashSecret = process.env.VNP_HASH_SECRET;
    this.vnp_Url = process.env.VNP_URL;
    this.vnp_ReturnUrl = process.env.VNP_RETURN_URL;
  }

  createPaymentUrl = async (paymentData) => {
    try {
      const { 
        order_id, 
        total, 
        ipAddr,
        orderInfo,
        orderType = 'billpayment',
        bankCode = '',
        language = 'vn'
      } = paymentData;

      // Tạo payment record
      const payment = await Payment.create({
        order_id,
        amount: total,
        paymentType: 'VNPay',
        status: 'pending'
      });

      const tmnCode = this.vnp_TmnCode;
      const secretKey = this.vnp_HashSecret;
      let vnpUrl = this.vnp_Url;
      const returnUrl = this.vnp_ReturnUrl;

      const date = new Date();
      const createDate = moment(date).format('YYYYMMDDHHmmss');
      const orderId = moment(date).format('HHmmss');
      const amount = total * 100; // Convert to smallest currency unit
      const currCode = 'VND';
      let vnp_Params = {};

      vnp_Params['vnp_Version'] = '2.1.0';
      vnp_Params['vnp_Command'] = 'pay';
      vnp_Params['vnp_TmnCode'] = tmnCode;
      vnp_Params['vnp_Locale'] = language;
      vnp_Params['vnp_CurrCode'] = currCode;
      vnp_Params['vnp_TxnRef'] = orderId;
      vnp_Params['vnp_OrderInfo'] = orderInfo;
      vnp_Params['vnp_OrderType'] = orderType;
      vnp_Params['vnp_Amount'] = amount;
      vnp_Params['vnp_ReturnUrl'] = returnUrl;
      vnp_Params['vnp_IpAddr'] = ipAddr;
      vnp_Params['vnp_CreateDate'] = createDate;
      if (bankCode !== null && bankCode !== '') {
        vnp_Params['vnp_BankCode'] = bankCode;
      }

      vnp_Params = this.sortObject(vnp_Params);

      const signData = querystring.stringify(vnp_Params, { encode: false });
      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');
      vnp_Params['vnp_SecureHash'] = signed;
      vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

      // Cập nhật payment record với transaction reference
      await payment.update({
        transactionRef: orderId,
        responseData: JSON.stringify({
          vnp_TxnRef: orderId,
          vnp_CreateDate: createDate
        })
      });

      return {
        success: true,
        orderId: order_id,
        vnpTxnRef: orderId,
        paymentUrl: vnpUrl
      };
    } catch (error) {
      console.error('Error creating payment URL:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  verifyReturnUrl = (vnpParams) => {
    try {
      const secureHash = vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHashType'];

      const sortedParams = this.sortObject(vnpParams);
      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
      const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');

      const isValid = secureHash === signed;
      const isSuccessful = vnpParams['vnp_ResponseCode'] === '00';

      return {
        isValid,
        isSuccessful,
        message: isValid 
          ? (isSuccessful ? 'Transaction successful' : 'Transaction failed')
          : 'Invalid signature'
      };
    } catch (error) {
      console.error('Error verifying return URL:', error);
      return {
        isValid: false,
        isSuccessful: false,
        message: 'Error verifying payment'
      };
    }
  }

  processIpn = (ipnData) => {
    try {
      const secureHash = ipnData['vnp_SecureHash'];
      delete ipnData['vnp_SecureHash'];
      delete ipnData['vnp_SecureHashType'];

      const sortedParams = this.sortObject(ipnData);
      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
      const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');

      const checkSum = secureHash === signed;

      if (checkSum) {
        // Kiểm tra tình trạng giao dịch trước khi cập nhật
        const orderId = ipnData['vnp_TxnRef'];
        const rspCode = ipnData['vnp_ResponseCode'];

        // Cập nhật kết quả thanh toán
        return { RspCode: '00', Message: 'Confirm Success' };
      } else {
        return { RspCode: '97', Message: 'Invalid Checksum' };
      }
    } catch (error) {
      console.error('Error processing IPN:', error);
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  async handleVNPayCallback(callbackData) {
    try {
      const { orderId, vnp_ResponseCode, vnp_TransactionStatus } = callbackData;
      
      // Tìm payment record
      const payment = await Payment.findOne({
        where: {
          order_id: orderId,
          status: 'pending'
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Cập nhật trạng thái payment
      const isSuccess = vnp_ResponseCode === '00' && vnp_TransactionStatus === '00';
      await payment.update({
        status: isSuccess ? 'completed' : 'failed',
        paymentDate: new Date(),
        responseData: JSON.stringify({
          ...JSON.parse(payment.responseData || '{}'),
          callback: callbackData
        })
      });

      // Cập nhật trạng thái đơn hàng
      const order = await Order.findByPk(orderId);
      if (order) {
        await order.update({
          status: isSuccess ? 'processing' : 'cancelled'
        });
      }

      return {
        success: true,
        message: isSuccess ? 'Payment completed' : 'Payment failed'
      };
    } catch (error) {
      console.error('Error handling VNPay callback:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      if (obj[key] !== null && obj[key] !== undefined) {
        sorted[key] = obj[key];
      }
    }
    
    return sorted;
  }
}

module.exports = new VNPayService(); 