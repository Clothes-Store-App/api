const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Order, { foreignKey: 'orderId' });
      Payment.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  Payment.init(
    {
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      paymentType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false
      },
      responseData: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      extraData: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      showtimeId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Payment',
      tableName: 'payments',
      timestamps: true
    }
  );
  return Payment;
}; 