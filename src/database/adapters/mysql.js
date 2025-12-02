// MySQL 数据库适配器
const mysql = require('mysql2/promise');

class MySQLAdapter {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  async init() {
    this.pool = mysql.createPool(this.config);
    await this.createTables();
  }

  async createTables() {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.query(`CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slave_id INT NOT NULL,
        port VARCHAR(255) NOT NULL,
        baudrate INT DEFAULT 9600,
        register_address INT NOT NULL,
        register_count INT DEFAULT 1,
        data_type VARCHAR(50) DEFAULT 'holding',
        \`interval\` INT DEFAULT 5000,
        enabled TINYINT DEFAULT 1,
        connection_type VARCHAR(50) DEFAULT 'rtu',
        ip_address VARCHAR(255),
        tcp_port INT DEFAULT 502,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      await connection.query(`CREATE TABLE IF NOT EXISTS data (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        device_id INT NOT NULL,
        value DOUBLE NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        INDEX idx_device_timestamp (device_id, timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      
      console.log('MySQL 表创建成功');
    } finally {
      connection.release();
    }
  }

  async query(sql, params = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows;
  }

  async run(sql, params = []) {
    await this.pool.query(sql, params);
  }

  async getDevices() {
    const [rows] = await this.pool.query('SELECT * FROM devices');
    return rows.map(row => ({
      ...row,
      enabled: row.enabled === 1
    }));
  }

  async addDevice(device) {
    const { name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port } = device;
    const [result] = await this.pool.query(
      `INSERT INTO devices (name, slave_id, port, baudrate, register_address, register_count, data_type, \`interval\`, enabled, connection_type, ip_address, tcp_port) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slave_id, port || '', baudrate || 9600, register_address, register_count || 1, data_type || 'holding', interval || 5000, enabled !== false ? 1 : 0, connection_type || 'rtu', ip_address || '', tcp_port || 502]
    );
    return result.insertId;
  }

  async updateDevice(id, device) {
    const { name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port } = device;
    await this.pool.query(
      `UPDATE devices SET name=?, slave_id=?, port=?, baudrate=?, register_address=?, register_count=?, data_type=?, \`interval\`=?, enabled=?, connection_type=?, ip_address=?, tcp_port=? WHERE id=?`,
      [name, slave_id, port || '', baudrate, register_address, register_count, data_type, interval, enabled ? 1 : 0, connection_type || 'rtu', ip_address || '', tcp_port || 502, id]
    );
  }

  async deleteDevice(id) {
    await this.pool.query('DELETE FROM devices WHERE id=?', [id]);
  }

  async saveData(deviceId, value) {
    await this.pool.query(
      'INSERT INTO data (device_id, value, timestamp) VALUES (?, ?, ?)',
      [deviceId, value, Date.now()]
    );
  }

  async getData(deviceId, limit) {
    const [rows] = await this.pool.query(
      'SELECT * FROM data WHERE device_id=? ORDER BY timestamp DESC LIMIT ?',
      [deviceId, limit]
    );
    return rows;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = MySQLAdapter;
