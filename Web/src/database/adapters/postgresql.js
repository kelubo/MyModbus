// PostgreSQL 数据库适配器
const { Pool } = require('pg');

class PostgreSQLAdapter {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  async init() {
    this.pool = new Pool(this.config);
    await this.createTables();
  }

  async createTables() {
    const client = await this.pool.connect();
    
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slave_id INTEGER NOT NULL,
        port VARCHAR(255) NOT NULL,
        baudrate INTEGER DEFAULT 9600,
        register_address INTEGER NOT NULL,
        register_count INTEGER DEFAULT 1,
        data_type VARCHAR(50) DEFAULT 'holding',
        interval INTEGER DEFAULT 5000,
        enabled SMALLINT DEFAULT 1,
        connection_type VARCHAR(50) DEFAULT 'rtu',
        ip_address VARCHAR(255),
        tcp_port INTEGER DEFAULT 502,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS data (
        id BIGSERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      )`);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_device_timestamp ON data(device_id, timestamp DESC)`);
      
      console.log('PostgreSQL 表创建成功');
    } finally {
      client.release();
    }
  }

  async query(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async run(sql, params = []) {
    await this.pool.query(sql, params);
  }

  async getDevices() {
    const result = await this.pool.query('SELECT * FROM devices');
    return result.rows.map(row => ({
      ...row,
      enabled: row.enabled === 1
    }));
  }

  async addDevice(device) {
    const { name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port } = device;
    const result = await this.pool.query(
      `INSERT INTO devices (name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [name, slave_id, port || '', baudrate || 9600, register_address, register_count || 1, data_type || 'holding', interval || 5000, enabled !== false ? 1 : 0, connection_type || 'rtu', ip_address || '', tcp_port || 502]
    );
    return result.rows[0].id;
  }

  async updateDevice(id, device) {
    const { name, slave_id, port, baudrate, register_address, register_count, data_type, interval, enabled, connection_type, ip_address, tcp_port } = device;
    await this.pool.query(
      `UPDATE devices SET name=$1, slave_id=$2, port=$3, baudrate=$4, register_address=$5, register_count=$6, data_type=$7, interval=$8, enabled=$9, connection_type=$10, ip_address=$11, tcp_port=$12, updated_at=CURRENT_TIMESTAMP WHERE id=$13`,
      [name, slave_id, port || '', baudrate, register_address, register_count, data_type, interval, enabled ? 1 : 0, connection_type || 'rtu', ip_address || '', tcp_port || 502, id]
    );
  }

  async deleteDevice(id) {
    await this.pool.query('DELETE FROM devices WHERE id=$1', [id]);
  }

  async saveData(deviceId, value) {
    await this.pool.query(
      'INSERT INTO data (device_id, value, timestamp) VALUES ($1, $2, $3)',
      [deviceId, value, Date.now()]
    );
  }

  async getData(deviceId, limit) {
    const result = await this.pool.query(
      'SELECT * FROM data WHERE device_id=$1 ORDER BY timestamp DESC LIMIT $2',
      [deviceId, limit]
    );
    return result.rows;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = PostgreSQLAdapter;
