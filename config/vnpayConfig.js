// require('dotenv').config();
// console.log('=== [VNPay] vnpayConfig loaded:', {
//   vnp_TmnCode: process.env.VNP_TMNCODE,
//   vnp_HashSecret: process.env.VNP_HASHSECRET,
//   vnp_Url: process.env.VNP_URL,
//   vnp_ReturnUrl: process.env.VNP_RETURNURL,
// });

// module.exports = {
//   vnp_TmnCode: process.env.VNP_TMNCODE,
//   vnp_HashSecret: process.env.VNP_HASHSECRET,
//   vnp_Url: process.env.VNP_URL,
//   vnp_ReturnUrl: process.env.VNP_RETURNURL,
// };
/**
 * Cấu hình VNPay
 */
module.exports = {
  // Terminal ID được cấp bởi VNPay
  vnp_TmnCode: "WVHCBEIS",
  
  // Khóa bí mật để tạo chữ ký
  vnp_HashSecret: "G835F4FT2LR70GPLQLDMVYRIJHN2YUPT",
  
  // URL thanh toán VNPay Sandbox
  vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  
  // URL API VNPay Sandbox
  vnp_Api: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  
  // URL trả về sau khi thanh toán
  vnp_ReturnUrl: "milkstore://payment-success",
  
  // URL nhận thông báo IPN từ VNPay
  vnp_IpnUrl: "http://192.168.1.16:8000/api/payments/process-ipn"
}; 