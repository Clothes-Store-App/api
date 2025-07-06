'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // Thêm các categories mặc định
    await queryInterface.bulkInsert('Categories', [
      {
        name: 'Áo',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Quần',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Váy',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Phụ kiện',
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Thêm các sizes mặc định
    await queryInterface.bulkInsert('ProductSizes', [
      {
        size_name: 'S',
        createdAt: now,
        updatedAt: now
      },
      {
        size_name: 'M',
        createdAt: now,
        updatedAt: now
      },
      {
        size_name: 'L',
        createdAt: now,
        updatedAt: now
      },
      {
        size_name: 'XL',
        createdAt: now,
        updatedAt: now
      },
      {
        size_name: 'XXL',
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('ProductSizes', null, {});
    await queryInterface.bulkDelete('Categories', null, {});
  }
};
