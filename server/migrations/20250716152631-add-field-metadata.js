'use strict'

/** @type {import('sequelize-cli').Migration} */

const TABLES = {
  EVENTS: 'events',
  MESSAGES: 'messages'
}

const COLUMN_NAME = 'metadata'

module.exports = {
  async up(queryInterface, Sequelize) {
    const COLUMN_DEF = {
      type: Sequelize.JSON,
      allowNull: true
    }

    return Promise.all([
      await queryInterface.addColumn(TABLES.EVENTS, COLUMN_NAME, COLUMN_DEF),
      await queryInterface.addColumn(TABLES.MESSAGES, COLUMN_NAME, COLUMN_DEF)
    ])
  },

  async down(queryInterface, Sequelize) {
    return Promise.all([
      await queryInterface.removeColumn(TABLES.EVENTS, COLUMN_NAME),
      await queryInterface.removeColumn(TABLES.MESSAGES, COLUMN_NAME)
    ])
  }
}
