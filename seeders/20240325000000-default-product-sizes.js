'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'].map(size => ({
      size_name: size,
      createdAt: now,
      updatedAt: now
    }));

    await queryInterface.bulkInsert('ProductSizes', sizes, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('ProductSizes', null, {});
  }
}; 