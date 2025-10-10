'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make Student.fullName nullable
    await queryInterface.changeColumn('students', 'fullName', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    // Make Subject.subjectName nullable
    await queryInterface.changeColumn('subjects', 'subjectName', {
      type: Sequelize.STRING(200),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes: make NOT NULL again
    await queryInterface.changeColumn('students', 'fullName', {
      type: Sequelize.STRING(100),
      allowNull: false
    });

    await queryInterface.changeColumn('subjects', 'subjectName', {
      type: Sequelize.STRING(200),
      allowNull: false
    });
  }
};
