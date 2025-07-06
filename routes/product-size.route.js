const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ApiProductSizeController = require("../controllers/product-size.controller");
const auth = require("../middleware/auth");
const { isAdmin } = require("../middleware/role");
const { validate } = require("../middleware/validator");
const { MESSAGE } = require("../constants/messages");
const { BASE_ENDPOINT } = require("../constants/endpoints");

// Route public - lấy danh sách size
router.get(BASE_ENDPOINT.BASE, ApiProductSizeController.getAll);
router.get(BASE_ENDPOINT.BY_ID, ApiProductSizeController.show);

// Route với phân quyền admin
router.post(
  BASE_ENDPOINT.BASE,
  auth,
  isAdmin,
  [
    body("size_name")
      .notEmpty()
      .withMessage(MESSAGE.VALIDATION.REQUIRED("Tên size"))
  ],
  validate,
  ApiProductSizeController.create
);

router.put(
  BASE_ENDPOINT.BY_ID,
  auth,
  isAdmin,
  [
    body("size_name")
      .notEmpty()
      .withMessage(MESSAGE.VALIDATION.REQUIRED("Tên size"))
  ],
  validate,
  ApiProductSizeController.update
);

router.delete(BASE_ENDPOINT.BY_ID, auth, isAdmin, ApiProductSizeController.remove);

module.exports = router; 