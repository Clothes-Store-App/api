const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ApiRatingController = require("../controllers/rating.controller");
const auth = require("../middleware/auth");
const { isAdmin } = require("../middleware/role");
const { validate } = require("../middleware/validator");
const { MESSAGE } = require("../constants/messages");
const { BASE_ENDPOINT } = require("../constants/endpoints");

// Middleware validation cho rating
const ratingValidation = [
  body("product_id")
    .isInt({ min: 1 })
    .withMessage(MESSAGE.VALIDATION.INVALID("Sản phẩm")),
  body("star")
    .isInt({ min: 1, max: 5 })
    .withMessage(MESSAGE.VALIDATION.INVALID("Số sao (1-5)")),
  body("text")
    .optional()
    .isString()
    .withMessage(MESSAGE.VALIDATION.INVALID("Nội dung đánh giá"))
];

const updateRatingValidation = [
  body("star")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage(MESSAGE.VALIDATION.INVALID("Số sao (1-5)")),
  body("text")
    .optional()
    .isString()
    .withMessage(MESSAGE.VALIDATION.INVALID("Nội dung đánh giá"))
];

// Route public - lấy đánh giá theo sản phẩm
router.get("/product/:productId", ApiRatingController.getRatingsByProduct);

// Route public - lấy thống kê đánh giá sản phẩm
router.get("/product/:productId/stats", ApiRatingController.getProductRatingStats);

// Route cần auth - tạo đánh giá mới
router.post(
  BASE_ENDPOINT.BASE,
  auth,
  ratingValidation,
  validate,
  ApiRatingController.createRating
);

// Route cần auth - cập nhật đánh giá
router.put(
  BASE_ENDPOINT.BY_ID,
  auth,
  updateRatingValidation,
  validate,
  ApiRatingController.updateRating
);

// Route cần auth - xóa đánh giá
router.delete(
  BASE_ENDPOINT.BY_ID,
  auth,
  ApiRatingController.deleteRating
);

// Route cần auth - lấy đánh giá của user hiện tại
router.get(
  BASE_ENDPOINT.USER_ONLY,
  auth,
  ApiRatingController.getRatingsByUser
);

// Route admin - lấy tất cả đánh giá
router.get(
  BASE_ENDPOINT.ADMIN_LIST,
  auth,
  isAdmin,
  ApiRatingController.getAllRatings
);

module.exports = router; 