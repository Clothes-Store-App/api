const { Wishlist, Product } = require('../models');

const wishlistService = {
  async addToWishlist(userId, productId) {
    // Tránh trùng lặp
    const [item, created] = await Wishlist.findOrCreate({
      where: { user_id: userId, product_id: productId },
    });
    return item;
  },

  async removeFromWishlist(userId, productId) {
    return Wishlist.destroy({ where: { user_id: userId, product_id: productId } });
  },

  async getUserWishlist(userId) {
    return Wishlist.findAll({
      where: { user_id: userId },
      include: [{ model: Product, as: 'product', include: ['colors'] }],
      order: [['created_at', 'DESC']]
    });
  },

  async isInWishlist(userId, productId) {
    const item = await Wishlist.findOne({ where: { user_id: userId, product_id: productId } });
    return !!item;
  }
};

module.exports = wishlistService; 