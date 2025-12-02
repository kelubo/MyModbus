// 备份管理器
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BackupManager {
  constructor(config) {
    this.config = config;
    this.backupDir = config.backupDir || './backups';
    this.maxBackups = config.maxBackups || 10;
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').split('T').join('_').split('.')[0];
  }

  async backupSQLite(dbPath) {
    try {
      const timestamp = this.getTimestamp();
      const backupName = `sqlite_backup_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupName);

      if (!fs.existsSync(dbPath)) {
        throw new Error(`数据库文件不存在: ${dbPath}`);
      }

      // 复制数据库文件
      fs.copyFileSync(dbPath, backupPath);

      console.log(`✓ SQLite 备份成功: ${backupName}`);
      return {
        success: true,
        backupPath,
        backupName,
        timestamp,
        size: fs.statSync(backupPath).size
      };
    } catch (err) {
      console.error('SQLite 备份失败:', err);
      throw err;
    }
  }

  async backupMySQL(config) {
    try {
      const timestamp = this.getTimestamp();
      const backupName = `mysql_backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupName);

      const command = `mysqldump -h ${config.host} -P ${config.port} -u ${config.user} -p${config.password} ${config.database} > "${backupPath}"`;

      await execAsync(command);

      console.log(`✓ MySQL 备份成功: ${backupName}`);
      return {
        success: true,
        backupPath,
        backupName,
        timestamp,
        size: fs.statSync(backupPath).size
      };
    } catch (err) {
      console.error('MySQL 备份失败:', err);
      throw err;
    }
  }

  async backupPostgreSQL(config) {
    try {
      const timestamp = this.getTimestamp();
      const backupName = `postgres_backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupName);

      const command = `PGPASSWORD=${config.password} pg_dump -h ${config.host} -p ${config.port} -U ${config.user} ${config.database} > "${backupPath}"`;

      await execAsync(command);

      console.log(`✓ PostgreSQL 备份成功: ${backupName}`);
      return {
        success: true,
        backupPath,
        backupName,
        timestamp,
        size: fs.statSync(backupPath).size
      };
    } catch (err) {
      console.error('PostgreSQL 备份失败:', err);
      throw err;
    }
  }

  async backupConfig() {
    try {
      const timestamp = this.getTimestamp();
      const backupName = `config_backup_${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupName);

      const config = {
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        database: {
          type: process.env.DB_TYPE,
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          name: process.env.DB_NAME
        },
        cluster: {
          enabled: process.env.CLUSTER_ENABLED,
          nodeId: process.env.NODE_ID,
          nodeRole: process.env.NODE_ROLE
        }
      };

      fs.writeFileSync(backupPath, JSON.stringify(config, null, 2));

      console.log(`✓ 配置备份成功: ${backupName}`);
      return {
        success: true,
        backupPath,
        backupName,
        timestamp,
        size: fs.statSync(backupPath).size
      };
    } catch (err) {
      console.error('配置备份失败:', err);
      throw err;
    }
  }

  async restoreSQLite(backupPath, targetPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份文件不存在: ${backupPath}`);
      }

      // 备份当前数据库
      if (fs.existsSync(targetPath)) {
        const backupCurrent = `${targetPath}.before-restore`;
        fs.copyFileSync(targetPath, backupCurrent);
        console.log(`✓ 当前数据库已备份: ${backupCurrent}`);
      }

      // 还原备份
      fs.copyFileSync(backupPath, targetPath);

      console.log(`✓ SQLite 还原成功`);
      return { success: true };
    } catch (err) {
      console.error('SQLite 还原失败:', err);
      throw err;
    }
  }

  async restoreMySQL(backupPath, config) {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份文件不存在: ${backupPath}`);
      }

      const command = `mysql -h ${config.host} -P ${config.port} -u ${config.user} -p${config.password} ${config.database} < "${backupPath}"`;

      await execAsync(command);

      console.log(`✓ MySQL 还原成功`);
      return { success: true };
    } catch (err) {
      console.error('MySQL 还原失败:', err);
      throw err;
    }
  }

  async restorePostgreSQL(backupPath, config) {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份文件不存在: ${backupPath}`);
      }

      const command = `PGPASSWORD=${config.password} psql -h ${config.host} -p ${config.port} -U ${config.user} ${config.database} < "${backupPath}"`;

      await execAsync(command);

      console.log(`✓ PostgreSQL 还原成功`);
      return { success: true };
    } catch (err) {
      console.error('PostgreSQL 还原失败:', err);
      throw err;
    }
  }

  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => file.includes('backup'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return backups;
    } catch (err) {
      console.error('列出备份失败:', err);
      return [];
    }
  }

  cleanOldBackups() {
    try {
      const backups = this.listBackups();
      
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        
        toDelete.forEach(backup => {
          fs.unlinkSync(backup.path);
          console.log(`✓ 删除旧备份: ${backup.name}`);
        });

        console.log(`✓ 清理完成，删除了 ${toDelete.length} 个旧备份`);
      }
    } catch (err) {
      console.error('清理旧备份失败:', err);
    }
  }

  deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份文件不存在: ${backupName}`);
      }

      fs.unlinkSync(backupPath);
      console.log(`✓ 删除备份: ${backupName}`);
      return { success: true };
    } catch (err) {
      console.error('删除备份失败:', err);
      throw err;
    }
  }

  getBackupInfo(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份文件不存在: ${backupName}`);
      }

      const stats = fs.statSync(backupPath);
      return {
        name: backupName,
        path: backupPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (err) {
      console.error('获取备份信息失败:', err);
      throw err;
    }
  }
}

module.exports = BackupManager;
