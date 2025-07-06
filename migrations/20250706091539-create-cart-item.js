'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CartItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      cart_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Carts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_color_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ProductColors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_size_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ProductSizes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      price: {
        type: Sequelize.DECIMAL(10, 0),
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Thêm unique constraint để tránh trùng lặp sản phẩm cùng màu và size trong giỏ hàng
    await queryInterface.addConstraint('CartItems', {
      fields: ['cart_id', 'product_id', 'product_color_id', 'product_size_id'],
      type: 'unique',
      name: 'unique_cart_product_color_size'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CartItems');
  }
}; 