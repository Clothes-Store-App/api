'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductSize extends Model {
    static associate(models) {
      ProductSize.belongsToMany(models.ProductColor, {
        through: 'ColorSizes',
        foreignKey: 'product_size_id',
        as: 'colors'
      });
    }
  }
  
  ProductSize.init({
    size_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'ProductSize',
  });
  
  return ProductSize;
}; 