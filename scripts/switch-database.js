#!/usr/bin/env node

// 数据库切换工具
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('========================================');
  console.log('Modbus RTU Manager - 数据库配置工具');
  console.log('========================================\n');

  console.log('请选择数据库类型:');
  console.log('1. SQLite (默认，无需配置)');
  console.log('2. MySQL');
  console.log('3. PostgreSQL\n');

  const choice = await question('请输入选项 (1-3): ');

  let envContent = '';

  switch (choice.trim()) {
    case '1':
      envContent = `# Modbus RTU Manager 配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_TYPE=sqlite
DB_FILE=./modbus.db
`;
      console.log('\n✓ 已配置为 SQLite');
      break;

    case '2':
      console.log('\n配置 MySQL:');
      const mysqlHost = await question('主机地址 (localhost): ') || 'localhost';
      const mysqlPort = await question('端口 (3306): ') || '3306';
      const mysqlUser = await question('用户名 (root): ') || 'root';
      const mysqlPassword = await question('密码: ');
      const mysqlDatabase = await question('数据库名 (modbus_manager): ') || 'modbus_manager';

      envContent = `# Modbus RTU Manager 配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_TYPE=mysql
DB_HOST=${mysqlHost}
DB_PORT=${mysqlPort}
DB_USER=${mysqlUser}
DB_PASSWORD=${mysqlPassword}
DB_NAME=${mysqlDatabase}
`;
      console.log('\n✓ 已配置为 MySQL');
      break;

    case '3':
      console.log('\n配置 PostgreSQL:');
      const pgHost = await question('主机地址 (localhost): ') || 'localhost';
      const pgPort = await question('端口 (5432): ') || '5432';
      const pgUser = await question('用户名 (postgres): ') || 'postgres';
      const pgPassword = await question('密码: ');
      const pgDatabase = await question('数据库名 (modbus_manager): ') || 'modbus_manager';

      envContent = `# Modbus RTU Manager 配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_TYPE=postgresql
DB_HOST=${pgHost}
DB_PORT=${pgPort}
DB_USER=${pgUser}
DB_PASSWORD=${pgPassword}
DB_NAME=${pgDatabase}
`;
      console.log('\n✓ 已配置为 PostgreSQL');
      break;

    default:
      console.log('\n✗ 无效选项');
      rl.close();
      return;
  }

  // 写入 .env 文件
  fs.writeFileSync(envPath, envContent);
  console.log(`\n配置已保存到: ${envPath}`);
  console.log('\n下一步:');
  console.log('1. 确保数据库服务已启动');
  console.log('2. 运行: node server.js');
  console.log('\n详细说明请查看: docs/DATABASE_GUIDE.md\n');

  rl.close();
}

main().catch(err => {
  console.error('错误:', err);
  rl.close();
  process.exit(1);
});
