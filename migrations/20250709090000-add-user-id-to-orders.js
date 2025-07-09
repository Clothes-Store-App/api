'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add user_id column back to Orders
    await queryInterface.addColumn('Orders', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null for guest orders
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL' // Keep order if user is deleted
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove user_id column
    await queryInterface.removeColumn('Orders', 'user_id');
  }
}; 