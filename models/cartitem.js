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
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    product_color_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ProductColors',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    product_size_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ProductSizes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 0),
      allowNull: false
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'CartItem',
    tableName: 'CartItems',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'product_id', 'product_color_id', 'product_size_id'],
        name: 'unique_user_product_color_size'
      }
    ]
  });
  
  return CartItem;
}; 