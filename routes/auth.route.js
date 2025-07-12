const express = require("express");
const router = express.Router();
const { body } = require('express-validator');
const ApiAuthController = require("../controllers/auth.controller");
const { validate } = require('../middleware/validator');
const { MESSAGE } = require('../constants/messages')
const { AUTH } = require('../constants/endpoints')
const auth = require('../middleware/auth'); // Import middleware auth

// Đăng nhập - thêm validation
router.post(
  AUTH.LOGIN, 
  [
    body('email').isEmail().withMessage(MESSAGE.VALIDATION.INVALID('Email')),
    body('password').notEmpty().withMessage(MESSAGE.VALIDATION.REQUIRED('Mật khẩu'))
  ],
  validate,
  ApiAuthController.login
);

// Đăng xuất
router.post(AUTH.LOGOUT, auth, ApiAuthController.logout);

// Làm mới token
router.post(
  AUTH.REFRESH,
  [
    body('refreshToken').optional()
  ],
  ApiAuthController.refresh
);

// Đăng ký - thêm validation
router.post(
  AUTH.REGISTER,
  [
    body('name').notEmpty().withMessage(MESSAGE.VALIDATION.REQUIRED('Tên')),
    body('email').isEmail().withMessage(MESSAGE.VALIDATION.INVALID('Email')),
    body('password')
      .isLength({ min: 6 })
      .withMessage(MESSAGE.VALIDATION.MIN_LENGTH('Mật khẩu', 6))
  ],
  validate,
  ApiAuthController.register
);

// Xác thực email
router.post(
  AUTH.VERIFY_EMAIL,
  [
    body('email').isEmail().withMessage(MESSAGE.VALIDATION.INVALID('Email')),
    body('code').notEmpty().withMessage(MESSAGE.VALIDATION.REQUIRED('Mã xác thực'))
  ],
  validate,
  ApiAuthController.verifyEmail
);

// Gửi lại mã xác thực email
router.post(
  AUTH.RESEND_VERIFICATION_EMAIL,
  [
    body('email').isEmail().withMessage(MESSAGE.VALIDATION.INVALID('Email'))
  ],
  validate,
  ApiAuthController.resendVerificationEmail
);

// Lấy thông tin profile
router.get(AUTH.PROFILE, auth, ApiAuthController.getProfile);

module.exports = router; 