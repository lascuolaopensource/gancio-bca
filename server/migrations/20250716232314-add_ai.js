'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('messages', 'author', {
            type: Sequelize.ENUM,
            values: ['AUTHOR', 'ADMIN', 'ANON', 'REGISTERED', 'AI']
        })
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('messages', 'author', {
            type: Sequelize.ENUM,
            values: ['AUTHOR', 'ADMIN', 'ANON', 'REGISTERED']
        })
    }
}
