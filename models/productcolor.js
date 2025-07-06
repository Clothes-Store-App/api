'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductColor extends Model {
    static associate(models) {
      // Quan hệ với Product
      ProductColor.belongsTo(models.Product, {
        foreignKey: 'product_id',
        onDelete: 'CASCADE'
      });

      // Quan hệ với ProductSize thông qua ColorSize
      ProductColor.belongsToMany(models.ProductSize, {
        through: 'ColorSizes',
        foreignKey: 'product_color_id',
        as: 'sizes'
      });

      // Quan hệ với ColorSize
      ProductColor.hasMany(models.ColorSize, {
        foreignKey: 'product_color_id',
        as: 'colorSizes'
      });
    }
  }
  
  ProductColor.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    color_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    color_code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ProductColor',
  });
  
  return ProductColor;
}; 