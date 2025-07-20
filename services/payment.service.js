const crypto = require("crypto");
const querystring = require("qs");
const moment = require("moment");
const vnpayConfig = require("../config/vnpayConfig");
const { Payment, Order } = require("../models");

const vnpayService = {
  /**
   * Tạo URL thanh toán VNPay cho đơn hàng đã có sẵn
   * @param {Object} paymentData Dữ liệu thanh toán
   * @returns {Object} Kết quả với URL thanh toán
   */
  createPaymentUrl: async (paymentData) => {
    try {
      const {
        orderId,
        amount,
        orderInfo = "Thanh toán đơn hàng",
        userId,
        ipAddr,
        bankCode = "",
        orderType = "billpayment",
        language = "vn",
      } = paymentData;
      console.log('=== [VNPay-OK] Creating payment URL with data:', paymentData);
      
    process.env.TZ = "Asia/Ho_Chi_Minh";
    const createDate = moment().format("YYYYMMDDHHmmss");
    const expireDate = moment().add(15, "minutes").format("YYYYMMDDHHmmss");

    const order = await Order.findByPk(orderId);
    if (!order) {
      return { success: false, message: "Order not found" };
    }

    const vnpTxnRef = `VNP${order.id}${moment().format("HHmmss")}`;

    const vnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: vnpayConfig.vnp_TmnCode,
      vnp_Locale: language,
      vnp_CurrCode: "VND",
      vnp_TxnRef: vnpTxnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };
    // vnpParams.vnp_OrderInfo = encodeURIComponent(vnpParams.vnp_OrderInfo);

    if (bankCode && bankCode !== "") {
      vnpParams.vnp_BankCode = bankCode;
    }

    // B1: Sắp xếp tham số theo alphabet
const sortedParams = vnpayService.sortObject(vnpParams);

// B2: Tạo chuỗi ký - KHÔNG ENCODE
const signData = querystring.stringify(sortedParams, { encode: false });
const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

// B3: Gắn chữ ký vào params
sortedParams.vnp_SecureHash = secureHash;

// B4: Tạo URL THANH TOÁN - NHỚ ENCODE = TRUE ở đây
const paymentUrl = `${vnpayConfig.vnp_Url}?${querystring.stringify(sortedParams, { encode: false })}`;

    // B6: Lưu vào DB nếu cần
    await Payment.create({
      orderId,
      amount,
      orderInfo,
      paymentType: "VNPay",
      status: "Pending",
      userId,
      responseData: JSON.stringify({
        vnpTxnRef,
        bankCode,
        amount,
      }),
    });

      return {
        success: true,
        orderId,
        vnpTxnRef,
        paymentUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to create payment URL",
      };
    }
  },

  /**
   * Xác thực callback từ VNPay
   */
  verifyReturnUrl: (vnpParams) => {
    try {
      if (!vnpParams || !vnpParams.vnp_SecureHash) {
        return {
          isValid: false,
          isSuccessful: false,
          error: "Missing secure hash",
        };
      }
      const isTestEnvironment = process.env.NODE_ENV !== "production";
      if (isTestEnvironment) {
        return {
          isValid: true,
          isSuccessful: vnpParams.vnp_ResponseCode === "00",
          data: {
            orderId: vnpParams.vnp_TxnRef,
            amount: parseInt(vnpParams.vnp_Amount) / 100,
            orderInfo: vnpParams.vnp_OrderInfo,
            responseCode: vnpParams.vnp_ResponseCode,
            transactionNo: vnpParams.vnp_TransactionNo,
            bankCode: vnpParams.vnp_BankCode,
            payDate: vnpParams.vnp_PayDate,
            cardType: vnpParams.vnp_CardType,
            bankTranNo: vnpParams.vnp_BankTranNo,
          },
        };
      }
      const secureHash = vnpParams.vnp_SecureHash;
      const params = { ...vnpParams };
      delete params.vnp_SecureHash;
      delete params.vnp_SecureHashType;
      const sortedParams = vnpayService.sortObject(params);
      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
      const calculatedHash = hmac
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");
      const isValid = secureHash === calculatedHash;
      return {
        isValid: isValid,
        isSuccessful: vnpParams.vnp_ResponseCode === "00",
        data: {
          orderId: vnpParams.vnp_TxnRef,
          amount: parseInt(vnpParams.vnp_Amount) / 100,
          orderInfo: vnpParams.vnp_OrderInfo,
          responseCode: vnpParams.vnp_ResponseCode,
          transactionNo: vnpParams.vnp_TransactionNo,
          bankCode: vnpParams.vnp_BankCode,
          payDate: vnpParams.vnp_PayDate,
          cardType: vnpParams.vnp_CardType,
          bankTranNo: vnpParams.vnp_BankTranNo,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        isSuccessful: false,
        error: error.message || "Failed to verify payment result",
      };
    }
  },

  /**
   * Xử lý IPN từ VNPay
   */
  processIpn: (ipnData) => {
    try {
      const secureHash = ipnData.vnp_SecureHash;
      if (!secureHash) {
        return { RspCode: "97", Message: "Missing signature" };
      }
      const params = { ...ipnData };
      delete params.vnp_SecureHash;
      delete params.vnp_SecureHashType;
      const sortedParams = vnpayService.sortObject(params);
      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
      const calculatedHash = hmac
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");
      if (secureHash !== calculatedHash) {
        return { RspCode: "97", Message: "Invalid signature" };
      }
      return { RspCode: "00", Message: "Confirmed" };
    } catch (error) {
      return { RspCode: "99", Message: "Unknown error" };
    }
  },

  /**
   * Sắp xếp object theo key
   */
  sortObject: (obj) => {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
  },

  /**
   * Xử lý callback từ VNPay để cập nhật trạng thái đơn hàng
   */
  handleVNPayCallback: async (callbackData) => {
    try {
      const {
        vnp_TxnRef,
        vnp_Amount,
        vnp_ResponseCode,
        vnp_TransactionNo,
        vnp_PayDate,
        orderId,
      } = callbackData;
      let order_id = orderId;
      if (!order_id && vnp_TxnRef) {
        const match = vnp_TxnRef.match(/VNP(\d+)/);
        if (match && match[1]) order_id = match[1];
      }
      // Không cập nhật trạng thái Order nữa
      const payment = await Payment.findOne({
        where: { orderId: order_id, paymentType: "VNPay" },
      });
      if (!payment)
        return {
          success: false,
          message: "Payment not found",
          orderId: order_id,
        };
      if (payment.status === "SUCCESS")
        return {
          success: true,
          message: "Payment already processed",
          orderId: order_id,
        };
      if (vnp_ResponseCode === "00") {
        await payment.update({
          status: "SUCCESS",
          responseData: JSON.stringify({
            ...JSON.parse(payment.responseData || "{}"),
            vnp_ResponseCode,
            vnp_TransactionNo,
            vnp_PayDate,
          }),
        });
        return {
          success: true,
          message: "Payment processed successfully",
          orderId: order_id,
        };
      } else {
        await payment.update({
          status: "FAILED",
          responseData: JSON.stringify({
            ...JSON.parse(payment.responseData || "{}"),
            vnp_ResponseCode,
            vnp_TransactionNo,
            vnp_PayDate,
          }),
        });
        return {
          success: false,
          message: "Payment failure processed",
          errorCode: vnp_ResponseCode,
          orderId: order_id,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Error occurred but processed",
        error: error.message,
      };
    }
  },
};

module.exports = vnpayService;
