// CommonJS migration for sequelize-cli compatibility
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const bcrypt = require('bcryptjs');

    // Hash password for admin user
    const saltRounds = 10;
    const adminPassword = '123456'; // You should change this to a secure password
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Insert admin user
    await queryInterface.bulkInsert('users', [{
      username: 'admin',
      email: 'admin@cs2.edu.vn',
      password: hashedPassword,
      fullName: 'Administrator',
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    // Remove admin user
    await queryInterface.bulkDelete('users', {
      username: 'admin'
    }, {});
  }
};