const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { validator } = require('../middleware/validator');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const { BASE_ENDPOINT } = require('../constants/endpoints')

// Middleware để validate dữ liệu khi thêm vào giỏ hàng
const addToCartValidation = [
  body('product_id').isInt().withMessage('Product ID must be an integer'),
  body('product_color_id').isInt().withMessage('Product color ID must be an integer'),
  body('product_size_id').isInt().withMessage('Product size ID must be an integer'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
];

// Middleware để validate quantity khi cập nhật
const updateQuantityValidation = [
  param('cartItemId').isInt().withMessage('Cart item ID must be an integer'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
];

// Middleware để validate cartItemId khi xóa
const cartItemIdValidation = [
  param('cartItemId').isInt().withMessage('Cart item ID must be an integer')
];

// Routes
router.post(BASE_ENDPOINT.BASE, 
  auth,
  cartController.addToCart
);

router.get(BASE_ENDPOINT.BASE, 
  auth,
  cartController.getCart
);

router.put(BASE_ENDPOINT.BY_ID,
  auth,
  cartController.updateCartItemQuantity
);

router.delete(BASE_ENDPOINT.BY_ID,
  auth,
  cartController.removeFromCart
);

router.delete('/clear',
  auth,
  cartController.clearCart
);

module.exports = router; 