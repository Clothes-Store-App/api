const authEndpoints = require("./auth");
const baseEndpoints = require("./base");
const analyticEndpoints = require('./analytic')
const postEndpoints = require("./post")
const chatbotEndpoints = require("./chatbot")
const voucherEndpoints = require("./voucher")
const vnpayEndpoints = require("./vnpay")
const wishlistEndpoints = require("./wishlist")

module.exports = {
  AUTH: authEndpoints,
  BASE_ENDPOINT: baseEndpoints,
  ANALYTICS: analyticEndpoints,
  POST_ENDPOINT: postEndpoints,
  CHATBOT_ENDPOINT: chatbotEndpoints,
  VOUCHER_ENDPOINT: voucherEndpoints,
  VNPAY_ENDPOINT: vnpayEndpoints,
  WISHLIST_ENDPOINT: wishlistEndpoints
};
