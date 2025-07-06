"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Posts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      content: {
        type: Sequelize.TEXT("LONG"),
        allowNull: false,
      },
      excerpt: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      thumbnail: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("DRAFT", "PUBLISHED"),
        defaultValue: "DRAFT",
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metaTitle: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metaDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
    });

    // Thêm các indexes
    await queryInterface.addIndex("Posts", ["slug"]);
    await queryInterface.addIndex("Posts", ["createdBy"]);
    await queryInterface.addIndex("Posts", ["status"]);
    await queryInterface.addIndex("Posts", ["featured"]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Posts");
  },
};
