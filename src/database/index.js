// 数据库工厂 - 统一接口
const config = require('../config/database.config');
const SQLiteAdapter = require('./adapters/sqlite');
const MySQLAdapter = require('./adapters/mysql');
const PostgreSQLAdapter = require('./adapters/postgresql');

class DatabaseFactory {
  static createAdapter() {
    const dbType = config.type.toLowerCase();
    
    switch (dbType) {
      case 'sqlite':
        return new SQLiteAdapter(config.sqlite);
      case 'mysql':
        return new MySQLAdapter(config.mysql);
      case 'postgresql':
      case 'postgres':
        return new PostgreSQLAdapter(config.postgresql);
      default:
        console.warn(`未知的数据库类型: ${dbType}, 使用 SQLite`);
        return new SQLiteAdapter(config.sqlite);
    }
  }
}

// 创建数据库实例
const dbAdapter = DatabaseFactory.createAdapter();

// 统一的数据库接口
const database = {
  adapter: dbAdapter,
  
  async init(callback) {
    try {
      await dbAdapter.init();
      console.log(`数据库初始化成功 (${config.type})`);
      if (callback) callback();
    } catch (err) {
      console.error('数据库初始化失败:', err);
      if (callback) callback(err);
    }
  },

  getDevices(callback) {
    dbAdapter.getDevices()
      .then(devices => callback(null, devices))
      .catch(err => callback(err));
  },

  addDevice(device, callback) {
    dbAdapter.addDevice(device)
      .then(id => callback(null, id))
      .catch(err => callback(err));
  },

  updateDevice(id, device, callback) {
    dbAdapter.updateDevice(id, device)
      .then(() => callback(null))
      .catch(err => callback(err));
  },

  deleteDevice(id, callback) {
    dbAdapter.deleteDevice(id)
      .then(() => callback(null))
      .catch(err => callback(err));
  },

  saveData(deviceId, value, callback) {
    dbAdapter.saveData(deviceId, value)
      .then(() => callback(null))
      .catch(err => callback(err));
  },

  getData(deviceId, limit, callback) {
    dbAdapter.getData(deviceId, limit)
      .then(data => callback(null, data))
      .catch(err => callback(err));
  },

  async close() {
    await dbAdapter.close();
  }
};

module.exports = database;
