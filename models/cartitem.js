'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CartItem extends Model {
    static associate(models) {
      // Quan hệ với User
      CartItem.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Quan hệ với Product
      CartItem.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
      });

      // Quan hệ với ProductColor
      CartItem.belongsTo(models.ProductColor, {
        foreignKey: 'product_color_id',
        as: 'color'
      });

      // Quan hệ với ProductSize
      CartItem.belongsTo(models.ProductSize, {
        foreignKey: 'product_size_id',
        as: 'size'
      });
    }
  }
  
  CartItem.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_color_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_size_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 0),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'CartItem',
  });
  
  return CartItem;
}; 