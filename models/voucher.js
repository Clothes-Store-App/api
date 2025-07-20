const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Voucher extends Model {
    static associate(models) {
      // define association here if needed
    }
  }
  Voucher.init(
    {
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      usage_limit: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      used_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      is_free_shipping: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'Voucher',
      tableName: 'vouchers',
      timestamps: true
    }
  );
  return Voucher;
}; 