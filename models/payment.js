'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
    }
  }
  
  Payment.init({
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 0),
      allowNull: false
    },
    paymentType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'VNPay'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    responseData: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // paymentDate: {
    //   type: DataTypes.DATE,
    //   allowNull: true
    // }
  }, {
    sequelize,
    modelName: 'Payment',
  });
  
  return Payment;
}; 