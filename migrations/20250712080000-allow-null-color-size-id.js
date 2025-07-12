'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Keep color_size_id as NOT NULL since business logic ensures it always has value
    // No changes needed - the original constraint is correct
    console.log('Migration skipped - color_size_id should remain NOT NULL');
  },

  async down(queryInterface, Sequelize) {
    // No changes needed
    console.log('Migration rollback skipped');
  }
}; 