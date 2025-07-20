const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist.controller');
const { BASE_ENDPOINT, WISHLIST_ENDPOINT } = require('../constants/endpoints');

// Thêm sản phẩm vào wishlist
router.post(BASE_ENDPOINT.BASE, wishlistController.add);
// Xóa sản phẩm khỏi wishlist
router.delete(BASE_ENDPOINT.BASE, wishlistController.remove);
// Lấy danh sách wishlist của user
router.get(BASE_ENDPOINT.BASE, wishlistController.getAll);
// Kiểm tra 1 sản phẩm có trong wishlist không
router.get(WISHLIST_ENDPOINT.CHECK, wishlistController.check);

module.exports = router; 