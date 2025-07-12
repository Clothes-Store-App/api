'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Quan hệ với Order (many-to-one)
      OrderItem.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order'
      });
      
      // Quan hệ với Product (many-to-one)
      OrderItem.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
      });

      // Quan hệ với ColorSize (many-to-one)
      OrderItem.belongsTo(models.ColorSize, {
        foreignKey: 'color_size_id',
        as: 'colorSize'
      });
    }
  }
  OrderItem.init({
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    color_size_id: {
      type: DataTypes.INTEGER,
      allowNull: false // Business logic ensures this always has a value
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 0),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'OrderItem',
  });
  return OrderItem;
};