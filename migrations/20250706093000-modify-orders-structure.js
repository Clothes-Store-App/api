'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Orders');

    // Try to remove foreign key constraint if exists
    try {
      const constraints = await queryInterface.getForeignKeyReferencesForTable('Orders');
      for (const constraint of constraints) {
        if (constraint.columnName === 'user_id' || constraint.columnName === 'userId') {
          await queryInterface.removeConstraint('Orders', constraint.constraintName);
        }
      }
    } catch (error) {
      console.log('No foreign key constraints to remove');
    }

    // Remove user_id column
    if (tableInfo.user_id) {
      await queryInterface.removeColumn('Orders', 'user_id');
    } else if (tableInfo.userId) {
      await queryInterface.removeColumn('Orders', 'userId');
    }

    // Add name column if it doesn't exist
    if (!tableInfo.name) {
      await queryInterface.addColumn('Orders', 'name', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      });
    }

    // Add phone column if it doesn't exist
    if (!tableInfo.phone) {
      await queryInterface.addColumn('Orders', 'phone', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      });
    }

    // Add address column if it doesn't exist
    if (!tableInfo.address) {
      await queryInterface.addColumn('Orders', 'address', {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      });
    }

    // Update total column precision
    await queryInterface.changeColumn('Orders', 'total', {
      type: Sequelize.DECIMAL(10, 0),
      allowNull: false,
      defaultValue: 0,
    });

    // Update status field to use ENUM
    await queryInterface.changeColumn('Orders', 'status', {
      type: Sequelize.ENUM('pending', 'processing', 'completed', 'cancelled'),
      defaultValue: 'pending'
    });
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Orders');

    // Add back user_id column
    await queryInterface.addColumn('Orders', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Remove the customer info columns if they exist
    if (tableInfo.name) {
      await queryInterface.removeColumn('Orders', 'name');
    }
    if (tableInfo.phone) {
      await queryInterface.removeColumn('Orders', 'phone');
    }
    if (tableInfo.address) {
      await queryInterface.removeColumn('Orders', 'address');
    }

    // Revert total column precision
    await queryInterface.changeColumn('Orders', 'total', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    // Revert status field to STRING
    await queryInterface.changeColumn('Orders', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'PENDING'
    });
  }
}; 