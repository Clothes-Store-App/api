'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define association with Product (one-to-many)
      Category.hasMany(models.Product, {
        foreignKey: 'category_id',
        as: 'products'
      });
    }
  }
  Category.init({
    name: DataTypes.STRING,
    image: DataTypes.STRING,
    deletedAt: DataTypes.DATE,
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      comment: 'Ẩn/hiện danh mục (true: hiện, false: ẩn)'
    },
  }, {
    sequelize,
    modelName: 'Category',
  });
  return Category;
};