// SQLite 数据库适配器
const initSqlJs = require('sql.js');
const fs = require('fs');

class SQLiteAdapter {
  constructor(config) {
    this.config = config;
    this.db = null;
  }

  async init() {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(this.config.filename)) {
      const buffer = fs.readFileSync(this.config.filename);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
    
    await this.createTables();
  }

  async createTables() {
    this.db.run(`CREATE TABLE IF NOT EXISTS devices (
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
      tcp_port INTEGER DEFAULT 502
    )`);

    this.db.run(`CREATE TABLE IF NOT EXISTS data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      value REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )`);
    
    this.save();
  }

  save() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.config.filename, buffer);
    }
  }

  async query(sql, params = []) {
    const result = this.db.exec(sql, params);
    return result;
  }

  async run(sql, params = []) {
    this.db.run(sql, params);
    this.save();
  }

  async getDevices() {
    const result = this.db.exec('SELECT * FROM devices');
    if (result.length === 0) return [];
    
    return result[0].values.map(row => ({
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
    }));
  }

  async addDevice(device) {
    const { name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port } = device;
    this.db.run(
      `INSERT INTO devices (name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slave_id, port || '', baudrate || 9600, register_address, register_count || 1, data_type || 'holding', interval || 5000, enabled !== false ? 1 : 0, connection_type || 'rtu', ip_address || '', tcp_port || 502]
    );
    
    const result = this.db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];
    this.save();
    return id;
  }

  async updateDevice(id, device) {
    const { name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port } = device;
    this.db.run(
      `UPDATE devices SET name=?, slave_id=?, port=?, baudrate=?, register_address=?, register_count=?, data_type=?, interval=?, enabled=?, connection_type=?, ip_address=?, tcp_port=? WHERE id=?`,
      [name, slave_id, port || '', baudrate, register_address, register_count, data_type, interval, enabled ? 1 : 0, connection_type || 'rtu', ip_address || '', tcp_port || 502, id]
    );
    this.save();
  }

  async deleteDevice(id) {
    this.db.run('DELETE FROM devices WHERE id=?', [id]);
    this.save();
  }

  async saveData(deviceId, value) {
    this.db.run(
      'INSERT INTO data (device_id, value, timestamp) VALUES (?, ?, ?)',
      [deviceId, value, Date.now()]
    );
    this.save();
  }

  async getData(deviceId, limit) {
    const result = this.db.exec(
      'SELECT * FROM data WHERE device_id=? ORDER BY timestamp DESC LIMIT ?',
      [deviceId, limit]
    );
    
    if (result.length === 0) return [];
    
    return result[0].values.map(row => ({
      id: row[0],
      device_id: row[1],
      value: row[2],
      timestamp: row[3]
    }));
  }

  async close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

module.exports = SQLiteAdapter;
