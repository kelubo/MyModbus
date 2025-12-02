// 数据库配置文件
// 支持 SQLite, MySQL, PostgreSQL

module.exports = {
  // 数据库类型: 'sqlite', 'mysql', 'postgresql'
  type: process.env.DB_TYPE || 'sqlite',
  
  // SQLite 配置
  sqlite: {
    filename: process.env.DB_FILE || './modbus.db'
  },
  
  // MySQL 配置
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'modbus_manager',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
  },
  
  // PostgreSQL 配置
  postgresql: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'modbus_manager',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
};
