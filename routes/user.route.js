const express = require("express");
const router = express.Router();
const { body } = require('express-validator');
const ApiUserController = require("../controllers/user.controller");
const auth = require("../middleware/auth");
const { isAdmin } = require("../middleware/role");
const { validate } = require('../middleware/validator');
const { MESSAGE } = require('../constants/messages')
const { BASE_ENDPOINT, AUTH } = require('../constants/endpoints')
const multer = require('multer');
const {upload} = require('../utils/multer');


// Route public - đăng ký tài khoản
router.post(
  BASE_ENDPOINT.REGISTER, 
  ApiUserController.create
);

// Route có xác thực
router.get(BASE_ENDPOINT.BASE, auth, isAdmin, ApiUserController.getAll);

router.put(
  BASE_ENDPOINT.BY_ID,
  auth,
  upload.single('image'), // Middleware xử lý upload file
  [
    body('name').optional().notEmpty().withMessage(MESSAGE.VALIDATION.REQUIRED('Tên')),
    body('email').optional().isEmail().withMessage(MESSAGE.VALIDATION.INVALID('Email')),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage(MESSAGE.VALIDATION.MIN_LENGTH('Mật khẩu', 6))
  ],
  validate,
  ApiUserController.update
);

router.delete(
  `${BASE_ENDPOINT.BY_ID}/image`,
  auth,
  ApiUserController.deleteImage
);

// Route quên mật khẩu
router.post(
  AUTH.FORGOT_PASSWORD,
  [
    body('email').isEmail().withMessage(MESSAGE.VALIDATION.INVALID('Email'))
  ],
  validate,
  ApiUserController.forgotPassword
);

// Route xác thực mã reset password
router.post(
  AUTH.VERIFY_RESET_CODE,
  [
    body('email').isEmail().withMessage(MESSAGE.VALIDATION.INVALID('Email')),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Mã xác thực phải có 6 số')
  ],
  validate,
  ApiUserController.verifyResetCode
);

// Route đặt lại mật khẩu
router.post(
  AUTH.RESET_PASSWORD,
  [
    body('resetToken').notEmpty().withMessage('Token là bắt buộc'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage(MESSAGE.VALIDATION.MIN_LENGTH('Mật khẩu', 6))
  ],
  validate,
  ApiUserController.resetPassword
);

// Route đổi mật khẩu
router.post(
  AUTH.CHANGE_PASSWORD,
  auth, // Middleware xác thực
  validate,
  ApiUserController.changePassword
);

module.exports = router; 