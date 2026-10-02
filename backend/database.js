const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:////tmp/master.db';
const storage = DATABASE_URL.startsWith('sqlite:///') ? DATABASE_URL.slice('sqlite:///'.length) : DATABASE_URL;
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: `/${storage.replace(/^\/+/, '')}`,
  logging: false,
  hooks: {
    afterConnect(connection) {
      connection.run('PRAGMA foreign_keys = ON');
    }
  }
});

module.exports = { sequelize, DATABASE_URL };
