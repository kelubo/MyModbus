const initSqlJs = require('sql.js');
const fs = require('fs');

let db = null;
const DB_FILE = './modbus.db';

async function init(callback) {
  try {
    const SQL = await initSqlJs();
    
    // 尝试加载现有数据库
    if (fs.existsSync(DB_FILE)) {
      const buffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    
    // 创建表
    db.run(`CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slave_id INTEGER NOT NULL,
      port TEXT NOT NULL,
      baudrate INTEGER DEFAULT 9600,
      register_address INTEGER NOT NULL,
      register_count INTEGER DEFAULT 1,
      data_type TEXT DEFAULT 'holding',
      interval INTEGER DEFAULT 5000,
      enabled INTEGER DEFAULT 1,
      connection_type TEXT DEFAULT 'rtu',
      ip_address TEXT,
      tcp_port INTEGER DEFAULT 502,
      location_id INTEGER,
      latitude REAL,
      longitude REAL,
      floor TEXT,
      room TEXT,
      rack TEXT,
      position_notes TEXT,
      FOREIGN KEY (location_id) REFERENCES locations(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'building',
      parent_id INTEGER,
      address TEXT,
      latitude REAL,
      longitude REAL,
      description TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (parent_id) REFERENCES locations(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      value REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS alarm_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      device_id INTEGER NOT NULL,
      condition TEXT NOT NULL,
      threshold REAL NOT NULL,
      level TEXT DEFAULT 'warning',
      enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      notification_email TEXT,
      notification_sms TEXT,
      notification_wecom INTEGER DEFAULT 0,
      notification_dingtalk INTEGER DEFAULT 0,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notification_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      config TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    
    saveDatabase();
    if (callback) callback();
  } catch (err) {
    console.error('数据库初始化失败:', err);
    if (callback) callback(err);
  }
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  }
}

function getDevices(callback) {
  try {
    const result = db.exec('SELECT * FROM devices');
    const devices = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      name: row[1],
      slave_id: row[2],
      port: row[3],
      baudrate: row[4],
      register_address: row[5],
      register_count: row[6],
      data_type: row[7],
      interval: row[8],
      enabled: row[9],
      connection_type: row[10] || 'rtu',
      ip_address: row[11] || '',
      tcp_port: row[12] || 502
    })) : [];
    callback(null, devices);
  } catch (err) {
    callback(err);
  }
}

function addDevice(device, callback) {
  try {
    const { name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port } = device;
    db.run(
      `INSERT INTO devices (name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slave_id, port || '', baudrate || 9600, register_address, register_count || 1, data_type || 'holding', interval || 5000, enabled !== false ? 1 : 0, connection_type || 'rtu', ip_address || '', tcp_port || 502]
    );
    
    const result = db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];
    saveDatabase();
    callback(null, id);
  } catch (err) {
    callback(err);
  }
}

function updateDevice(id, device, callback) {
  try {
    const { name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port } = device;
    db.run(
      `UPDATE devices SET name=?, slave_id=?, port=?, baudrate=?, register_address=?, register_count=?, data_type=?, interval=?, enabled=?, connection_type=?, ip_address=?, tcp_port=? WHERE id=?`,
      [name, slave_id, port || '', baudrate, register_address, register_count, data_type, interval, enabled ? 1 : 0, connection_type || 'rtu', ip_address || '', tcp_port || 502, id]
    );
    saveDatabase();
    callback(null);
  } catch (err) {
    callback(err);
  }
}

function deleteDevice(id, callback) {
  try {
    db.run('DELETE FROM devices WHERE id=?', [id]);
    saveDatabase();
    callback(null);
  } catch (err) {
    callback(err);
  }
}

function saveData(deviceId, value, callback) {
  try {
    db.run(
      'INSERT INTO data (device_id, value, timestamp) VALUES (?, ?, ?)',
      [deviceId, value, Date.now()]
    );
    saveDatabase();
    callback(null);
  } catch (err) {
    callback(err);
  }
}

function getData(deviceId, limit, callback) {
  try {
    const result = db.exec(
      'SELECT * FROM data WHERE device_id=? ORDER BY timestamp DESC LIMIT ?',
      [deviceId, limit]
    );
    const data = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      device_id: row[1],
      value: row[2],
      timestamp: row[3]
    })) : [];
    callback(null, data);
  } catch (err) {
    callback(err);
  }
}

// 告警规则管理
function getAlarmRules(callback) {
  try {
    const result = db.exec('SELECT * FROM alarm_rules');
    const rules = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      name: row[1],
      device_id: row[2],
      condition: row[3],
      threshold: row[4],
      level: row[5],
      enabled: row[6],
      created_at: row[7]
    })) : [];
    callback(null, rules);
  } catch (err) {
    callback(err);
  }
}

function addAlarmRule(rule, callback) {
  try {
    const { name, device_id, condition, threshold, level, enabled } = rule;
    db.run(
      `INSERT INTO alarm_rules (name, device_id, condition, threshold, level, enabled, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, device_id, condition, threshold, level || 'warning', enabled !== false ? 1 : 0, Date.now()]
    );
    
    const result = db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];
    saveDatabase();
    callback(null, id);
  } catch (err) {
    callback(err);
  }
}

function updateAlarmRule(id, rule, callback) {
  try {
    const { name, device_id, condition, threshold, level, enabled } = rule;
    db.run(
      `UPDATE alarm_rules SET name=?, device_id=?, condition=?, threshold=?, level=?, enabled=? WHERE id=?`,
      [name, device_id, condition, threshold, level, enabled ? 1 : 0, id]
    );
    saveDatabase();
    callback(null);
  } catch (err) {
    callback(err);
  }
}

function deleteAlarmRule(id, callback) {
  try {
    db.run('DELETE FROM alarm_rules WHERE id=?', [id]);
    saveDatabase();
    callback(null);
  } catch (err) {
    callback(err);
  }
}

// 通知配置管理
function getNotificationConfig(callback) {
  try {
    const result = db.exec('SELECT * FROM notification_config');
    const configs = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      type: row[1],
      enabled: row[2],
      config: JSON.parse(row[3])
    })) : [];
    callback(null, configs);
  } catch (err) {
    callback(err);
  }
}

function saveNotificationConfig(type, enabled, config, callback) {
  try {
    // 检查是否已存在
    const result = db.exec('SELECT id FROM notification_config WHERE type=?', [type]);
    
    if (result.length > 0 && result[0].values.length > 0) {
      // 更新
      db.run(
        'UPDATE notification_config SET enabled=?, config=? WHERE type=?',
        [enabled ? 1 : 0, JSON.stringify(config), type]
      );
    } else {
      // 插入
      db.run(
        'INSERT INTO notification_config (type, enabled, config) VALUES (?, ?, ?)',
        [type, enabled ? 1 : 0, JSON.stringify(config)]
      );
    }
    
    saveDatabase();
    callback(null);
  } catch (err) {
    callback(err);
  }
}

// 系统设置管理
function getSystemSettings(callback) {
  try {
    const result = db.exec('SELECT * FROM system_settings');
    const settings = {};
    if (result.length > 0) {
      result[0].values.forEach(row => {
        settings[row[1]] = row[2]; // key: value
      });
    }
    
    // 设置默认值
    if (!settings.timezone) settings.timezone = 'Asia/Shanghai';
    if (!settings.timeFormat) settings.timeFormat = '24h';
    if (!settings.dateFormat) settings.dateFormat = 'YYYY-MM-DD';
    
    callback(null, settings);
  } catch (err) {
    callback(err);
  }
}

function saveSystemSetting(key, value, callback) {
  try {
    // 检查是否已存在
    const result = db.exec('SELECT id FROM system_settings WHERE key=?', [key]);
    
    if (result.length > 0 && result[0].values.length > 0) {
      // 更新
      db.run(
        'UPDATE system_settings SET value=?, updated_at=? WHERE key=?',
        [value, Date.now(), key]
      );
    } else {
      // 插入
      db.run(
        'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, Date.now()]
      );
    }
    
    saveDatabase();
    callback(null);
  } catch (err) {
    callback(err);
  }
}

async function close() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// 位置管理函数
function getLocations(callback) {
  try {
    const stmt = db.prepare('SELECT * FROM locations ORDER BY parent_id, name');
    const locations = [];
    while (stmt.step()) {
      locations.push(stmt.getAsObject());
    }
    stmt.free();
    callback(null, locations);
  } catch (error) {
    callback(error);
  }
}

function addLocation(location, callback) {
  try {
    const stmt = db.prepare(`
      INSERT INTO locations (name, type, parent_id, address, latitude, longitude, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      location.name,
      location.type || 'building',
      location.parent_id || null,
      location.address || null,
      location.latitude || null,
      location.longitude || null,
      location.description || null
    ]);
    stmt.free();
    saveDatabase();
    callback(null, { id: db.exec('SELECT last_insert_rowid()')[0].values[0][0] });
  } catch (error) {
    callback(error);
  }
}

function updateLocation(id, location, callback) {
  try {
    const stmt = db.prepare(`
      UPDATE locations 
      SET name = ?, type = ?, parent_id = ?, address = ?, latitude = ?, longitude = ?, description = ?
      WHERE id = ?
    `);
    stmt.run([
      location.name,
      location.type,
      location.parent_id || null,
      location.address || null,
      location.latitude || null,
      location.longitude || null,
      location.description || null,
      id
    ]);
    stmt.free();
    saveDatabase();
    callback(null);
  } catch (error) {
    callback(error);
  }
}

function deleteLocation(id, callback) {
  try {
    // 检查是否有设备使用此位置
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM devices WHERE location_id = ?');
    checkStmt.bind([id]);
    checkStmt.step();
    const result = checkStmt.getAsObject();
    checkStmt.free();
    
    if (result.count > 0) {
      return callback(new Error('无法删除：有设备正在使用此位置'));
    }
    
    // 检查是否有子位置
    const checkChildStmt = db.prepare('SELECT COUNT(*) as count FROM locations WHERE parent_id = ?');
    checkChildStmt.bind([id]);
    checkChildStmt.step();
    const childResult = checkChildStmt.getAsObject();
    checkChildStmt.free();
    
    if (childResult.count > 0) {
      return callback(new Error('无法删除：存在子位置'));
    }
    
    const stmt = db.prepare('DELETE FROM locations WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    saveDatabase();
    callback(null);
  } catch (error) {
    callback(error);
  }
}

function getDevicesByLocation(locationId, callback) {
  try {
    const stmt = db.prepare('SELECT * FROM devices WHERE location_id = ?');
    stmt.bind([locationId]);
    const devices = [];
    while (stmt.step()) {
      devices.push(stmt.getAsObject());
    }
    stmt.free();
    callback(null, devices);
  } catch (error) {
    callback(error);
  }
}

module.exports = {
  init,
  getDevices,
  addDevice,
  updateDevice,
  deleteDevice,
  saveData,
  getData,
  getAlarmRules,
  addAlarmRule,
  updateAlarmRule,
  deleteAlarmRule,
  getNotificationConfig,
  saveNotificationConfig,
  getSystemSettings,
  saveSystemSetting,
  getLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  getDevicesByLocation,
  close
};
