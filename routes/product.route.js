const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ApiProductController = require("../controllers/product.controller");
const auth = require("../middleware/auth");
const { isAdmin } = require("../middleware/role");
const { validate } = require("../middleware/validator");
const { uploadProductImages } = require("../utils/multer");
const { MESSAGE } = require("../constants/messages");
const { BASE_ENDPOINT } = require("../constants/endpoints");

// Route public
router.get(BASE_ENDPOINT.SELLING, ApiProductController.getTopSelling);
router.get(BASE_ENDPOINT.BASE, ApiProductController.getAll);
router.get(BASE_ENDPOINT.BY_ID, ApiProductController.show);

// Route với phân quyền admin
router.get(
  BASE_ENDPOINT.ADMIN_LIST,

  ApiProductController.getAllByAdmin
);

// Middleware validation cho product
const productValidation = [
  body("name")
    .notEmpty()
    .withMessage(MESSAGE.VALIDATION.REQUIRED("Tên sản phẩm")),
  body("price")
    .isFloat({ min: 0 })
    .withMessage(MESSAGE.VALIDATION.MUST_BE_POSITIVE_NUMBER("Giá")),
  body("category_id")
    .isInt({ min: 1 })
    .withMessage(MESSAGE.VALIDATION.INVALID("Danh mục")),
  body("colors")
    .isArray()
    .withMessage(MESSAGE.VALIDATION.REQUIRED("Màu sắc")),
  body("colors.*.color_name")
    .notEmpty()
    .withMessage(MESSAGE.VALIDATION.REQUIRED("Tên màu")),
  body("colors.*.color_code")
    .notEmpty()
    .withMessage(MESSAGE.VALIDATION.REQUIRED("Mã màu")),
  body("colors.*.sizes")
    .isArray()
    .withMessage(MESSAGE.VALIDATION.REQUIRED("Size"))
];

// Route tạo sản phẩm mới
router.post(
  BASE_ENDPOINT.BASE,
  auth,
  isAdmin,
  uploadProductImages, // Xử lý upload ảnh trước
 
  validate,
  ApiProductController.createProduct
);

// Route cập nhật sản phẩm
router.put(
  BASE_ENDPOINT.BY_ID,
  auth,
  isAdmin,
  uploadProductImages,
  validate,
  ApiProductController.updateProduct
);


router.delete(BASE_ENDPOINT.BY_ID, auth, isAdmin, ApiProductController.remove);


module.exports = router;
