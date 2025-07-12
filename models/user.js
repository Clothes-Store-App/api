'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Quan hệ với Rating
      User.hasMany(models.Rating, {
        foreignKey: 'user_id',
        as: 'ratings'
      });
    }
  }
  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'ROLE_USER'
    },
    push_token: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reset_password_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_verification_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email_verification_expires: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};