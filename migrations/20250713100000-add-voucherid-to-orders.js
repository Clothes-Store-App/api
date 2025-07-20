'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'voucherId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'vouchers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('orders', 'voucherId');
  }
}; 