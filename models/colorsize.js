'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ColorSize extends Model {
    static associate(models) {
      // Quan hệ với Product
      ColorSize.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
      });

      // Quan hệ với ProductColor
      ColorSize.belongsTo(models.ProductColor, {
        foreignKey: 'product_color_id',
        as: 'color'
      });

      // Quan hệ với ProductSize
      ColorSize.belongsTo(models.ProductSize, {
        foreignKey: 'product_size_id',
        as: 'size'
      });

      // Quan hệ với OrderItem
      ColorSize.hasMany(models.OrderItem, {
        foreignKey: 'color_size_id',
        as: 'orderItems'
      });
    }
  }
  
  ColorSize.init({
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      }
    },
    product_color_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_size_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ColorSize',
    indexes: [
      {
        unique: true,
        fields: ['product_id', 'product_color_id', 'product_size_id']
      }
    ]
  });
  
  return ColorSize;
}; 