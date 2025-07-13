const { CartItem, Product, ProductColor, ProductSize } = require('../models');
const { Op } = require('sequelize');

class CartService {
  async addToCart(userId, productData) {
  try {
    const { product_id, product_color_id, product_size_id, quantity, price } = productData;

    const product = await Product.findByPk(product_id);
    if (!product) throw new Error('Product not found');

    const color = await ProductColor.findByPk(product_color_id);
    if (!color || color.product_id !== product_id) {
      throw new Error('Invalid product color');
    }

    const size = await ProductSize.findByPk(product_size_id);
    if (!size) {
      throw new Error('Invalid product size');
    }

    let cartItem = await CartItem.findOne({
      where: {
        user_id: userId,
        product_id,
        product_color_id,
        product_size_id
      }
    });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        user_id: userId,
        product_id,
        product_color_id,
        product_size_id,
        quantity,
        price
      });
    }

    return cartItem;

  } catch (err) {
    console.error('❌ Error in addToCart:', err);
    throw err; // hoặc return lỗi cụ thể nếu bạn dùng try/catch ở controller
  }
}


  async getCartItems(userId) {
    const items = await CartItem.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'description']
        },
        {
          model: ProductColor,
          as: 'color',
        },
        {
          model: ProductSize,
          as: 'size',
          attributes: ['id', 'size_name']
        }
      ]
    });

    const total_amount = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    return {
      items,
      total_amount
    };
  }

  async updateCartItemQuantity(userId, cartItemId, quantity) {
    const cartItem = await CartItem.findOne({
      where: {
        id: cartItemId,
        user_id: userId
      }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    if (quantity <= 0) {
      await cartItem.destroy();
      return null;
    } else {
      cartItem.quantity = quantity;
      await cartItem.save();
      return cartItem;
    }
  }

  async removeFromCart(userId, cartItemId) {
    const cartItem = await CartItem.findOne({
      where: {
        id: cartItemId,
        user_id: userId
      }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    await cartItem.destroy();
    return { success: true };
  }

  async clearCart(userId) {
    await CartItem.destroy({
      where: { user_id: userId }
    });

    return { success: true };
  }
}

module.exports = new CartService(); 