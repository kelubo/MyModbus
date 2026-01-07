// 加载环境变量
require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');
const systemConfig = require('./config/system.config');
const modbusManager = require('./modbusManager');
const si = require('systeminformation');
const dbConfig = require('./config/database.config');
const clusterConfig = require('./config/cluster.config');
const ClusterManager = require('./cluster/ClusterManager');
const BackupManager = require('./backup/BackupManager');
const AlarmManager = require('./alarm/AlarmManager');
const NotificationManager = require('./alarm/NotificationManager');
const TimeSync = require('./time/TimeSync');
const ModbusDeviceInitializer = require('./tools/ModbusDeviceInitializer');
const PrometheusExporter = require('./monitoring/PrometheusExporter');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Prometheus HTTP 请求监控中间件
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    prometheusExporter.recordHTTPRequest(
      req.method,
      req.route ? req.route.path : req.path,
      res.statusCode,
      duration
    );
  });
  
  next();
});

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `logo-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: systemConfig.upload.maxSize
  },
  fileFilter: (req, file, cb) => {
    if (systemConfig.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// WebSocket连接处理
wss.on('connection', (ws) => {
  console.log('客户端已连接');
  ws.on('close', () => console.log('客户端已断开'));
});

// 广播数据到所有客户端
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Prometheus metrics 端点
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', prometheusExporter.getContentType());
    const metrics = await prometheusExporter.getMetrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 设备管理API
app.get('/api/devices', (req, res) => {
  db.getDevices((err, devices) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // 更新 Prometheus 设备指标
    prometheusExporter.updateDeviceMetrics(devices);
    
    res.json(devices);
  });
});

app.post('/api/devices', (req, res) => {
  const device = req.body;
  db.addDevice(device, (err, id) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, message: '设备添加成功' });
  });
});

app.put('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  const device = req.body;
  db.updateDevice(id, device, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '设备更新成功' });
  });
});

app.delete('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  db.deleteDevice(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '设备删除成功' });
  });
});

// 数据采集API
app.get('/api/data/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const limit = req.query.limit || 100;
  db.getData(deviceId, limit, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

// 位置管理 API
app.get('/api/locations', (req, res) => {
  db.getLocations((err, locations) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(locations);
  });
});

app.post('/api/locations', (req, res) => {
  const location = req.body;
  db.addLocation(location, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.id, message: '位置已添加' });
  });
});

app.put('/api/locations/:id', (req, res) => {
  const { id } = req.params;
  const location = req.body;
  db.updateLocation(id, location, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '位置已更新' });
  });
});

app.delete('/api/locations/:id', (req, res) => {
  const { id } = req.params;
  db.deleteLocation(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '位置已删除' });
  });
});

app.get('/api/locations/:id/devices', (req, res) => {
  const { id } = req.params;
  db.getDevicesByLocation(id, (err, devices) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(devices);
  });
});

// 启动数据采集
app.post('/api/collection/start', (req, res) => {
  modbusManager.startCollection(broadcast);
  res.json({ message: '数据采集已启动' });
});

app.post('/api/collection/stop', (req, res) => {
  modbusManager.stopCollection();
  res.json({ message: '数据采集已停止' });
});

// 写入寄存器API
app.post('/api/devices/:id/write', async (req, res) => {
  const { id } = req.params;
  const { address, value, values } = req.body;
  
  db.getDevices((err, devices) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const device = devices.find(d => d.id == id);
    if (!device) return res.status(404).json({ error: '设备不存在' });
    
    (async () => {
      try {
        if (values && Array.isArray(values)) {
          await modbusManager.writeMultipleRegisters(device, address, values);
          res.json({ message: '写入多个寄存器成功' });
        } else {
          await modbusManager.writeSingleRegister(device, address, value);
          res.json({ message: '写入寄存器成功' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    })();
  });
});

// 修改设备IP地址API
app.post('/api/devices/:id/set-ip', async (req, res) => {
  const { id } = req.params;
  const { newIP, ipRegisterAddress } = req.body;
  
  db.getDevices((err, devices) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const device = devices.find(d => d.id == id);
    if (!device) return res.status(404).json({ error: '设备不存在' });
    
    (async () => {
      try {
        await modbusManager.writeDeviceIP(device, newIP, ipRegisterAddress);
        res.json({ message: `设备IP地址已更新为: ${newIP}` });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    })();
  });
});

// 系统监控API
app.get('/api/system/info', async (req, res) => {
  try {
    const [cpu, mem, disk, osInfo, networkInterfaces] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.osInfo(),
      si.networkInterfaces()
    ]);
    
    res.json({
      cpu: {
        usage: cpu.currentLoad.toFixed(2),
        cores: cpu.cpus.length
      },
      memory: {
        total: (mem.total / 1024 / 1024 / 1024).toFixed(2),
        used: (mem.used / 1024 / 1024 / 1024).toFixed(2),
        free: (mem.free / 1024 / 1024 / 1024).toFixed(2),
        usage: ((mem.used / mem.total) * 100).toFixed(2)
      },
      disk: disk.map(d => ({
        fs: d.fs,
        type: d.type,
        size: (d.size / 1024 / 1024 / 1024).toFixed(2),
        used: (d.used / 1024 / 1024 / 1024).toFixed(2),
        available: (d.available / 1024 / 1024 / 1024).toFixed(2),
        usage: d.use.toFixed(2)
      })),
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: osInfo.hostname
      },
      network: networkInterfaces.filter(iface => !iface.internal).map(iface => ({
        iface: iface.iface,
        ip4: iface.ip4,
        ip6: iface.ip6,
        mac: iface.mac,
        speed: iface.speed
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建集群管理器
const clusterManager = new ClusterManager(clusterConfig);

// 创建备份管理器
const backupManager = new BackupManager({
  backupDir: process.env.BACKUP_DIR || './backups',
  maxBackups: parseInt(process.env.MAX_BACKUPS) || 10
});

// 创建通知管理器
let notificationManager = null;

// 创建告警管理器
let alarmManager = null;

// 创建时间同步管理器
const timeSync = new TimeSync({
  source: process.env.TIME_SOURCE || 'local',
  gpsPort: process.env.GPS_PORT || '/dev/ttyUSB0',
  gpsBaudRate: parseInt(process.env.GPS_BAUDRATE) || 9600,
  ppsDevice: process.env.PPS_DEVICE || '/dev/pps0',
  ntpServer: process.env.NTP_SERVER || 'pool.ntp.org',
  syncInterval: parseInt(process.env.TIME_SYNC_INTERVAL) || 3600000
});

// 创建 NTP 服务器
const NTPServer = require('./time/NTPServer');
const ntpServer = new NTPServer({
  port: parseInt(process.env.NTP_SERVER_PORT) || 123,
  clockSource: process.env.TIME_SOURCE || 'local',
  stratum: parseInt(process.env.NTP_STRATUM) || 1
});

// 将时间同步管理器传递给 NTP 服务器
ntpServer.setTimeSync(timeSync);

// 创建时间同步监控器
const TimeSyncMonitor = require('./time/TimeSyncMonitor');
const timeSyncMonitor = new TimeSyncMonitor(timeSync);

// 创建 Prometheus 导出器
const prometheusExporter = new PrometheusExporter();

// 初始化数据库和集群
db.init(async () => {
  // 初始化时间同步
  try {
    await timeSync.init();
    
    // 启动时间同步监控
    timeSyncMonitor.start();
    
    // 监听时间同步事件
    timeSync.on('time-synced', (data) => {
      console.log(`⏰ 时间已同步 [${data.source}]: ${data.time.toISOString()}`);
      
      // 更新 Prometheus 指标
      prometheusExporter.recordTimeSync(data.source, data.duration || 0, true);
      if (data.ppsOffset !== undefined) {
        prometheusExporter.updatePPSOffset(data.ppsOffset);
      }
    });
    
    timeSync.on('gps-connected', () => {
      console.log('📡 GPS 已连接');
    });
    
    timeSync.on('pps-connected', () => {
      console.log('⚡ PPS 已连接');
    });
    
    timeSync.on('gps-error', (err) => {
      console.error('📡 GPS 错误:', err.message);
    });
    
    timeSync.on('source-changed', (data) => {
      console.log(`🔄 时间源已切换: ${data.oldSource} -> ${data.newSource}`);
      // 同步更新 NTP 服务器的时钟源
      if (ntpServer.isRunning) {
        ntpServer.updateClockSource(data.newSource);
      }
    });
  } catch (err) {
    console.error('时间同步初始化失败:', err.message);
  }
  
  // 启动 NTP 服务器（如果配置启用）
  if (process.env.NTP_SERVER_ENABLED === 'true') {
    try {
      await ntpServer.start();
      
      // 监听 NTP 服务器事件
      ntpServer.on('request', (data) => {
        console.log(`🕐 NTP 请求: ${data.client} [总计: ${data.count}]`);
      });
      
      ntpServer.on('error', (err) => {
        console.error('🕐 NTP 服务器错误:', err.message);
      });
    } catch (err) {
      console.error('NTP 服务器启动失败:', err.message);
      console.log('提示: 端口 123 需要 root 权限，或使用其他端口');
    }
  }
  
  // 加载通知配置
  db.getNotificationConfig((err, configs) => {
    if (!err && configs) {
      const notificationConfig = {};
      configs.forEach(cfg => {
        notificationConfig[cfg.type] = {
          enabled: cfg.enabled === 1,
          ...cfg.config
        };
      });
      notificationManager = new NotificationManager(notificationConfig);
    } else {
      notificationManager = new NotificationManager({});
    }
  });
  
  // 初始化告警管理器
  try {
    alarmManager = new AlarmManager(db, notificationManager);
    await alarmManager.init();
    modbusManager.setAlarmManager(alarmManager);
    
    // 监听告警事件
    alarmManager.on('alarm-triggered', (alarm) => {
      console.log(`🚨 告警触发: ${alarm.message}`);
      // 广播告警到所有客户端
      broadcast({
        type: 'alarm',
        action: 'triggered',
        alarm
      });
    });
    
    alarmManager.on('alarm-recovered', (alarm) => {
      console.log(`✅ 告警恢复: ${alarm.message}`);
      // 广播告警恢复到所有客户端
      broadcast({
        type: 'alarm',
        action: 'recovered',
        alarm
      });
    });
  } catch (err) {
    console.error('告警管理器初始化失败:', err.message);
  }
  
  // 初始化集群管理器
  try {
    await clusterManager.init();
    modbusManager.setClusterManager(clusterManager);
    
    // 监听集群事件
    clusterManager.on('broadcast', (msg) => {
      if (msg.event === 'device-data') {
        // 转发其他节点的数据到本地 WebSocket 客户端
        modbusManager.handleClusterData(msg.data);
      }
    });
    
    clusterManager.on('command', (msg) => {
      console.log(`收到集群命令: ${msg.command} from ${msg.from}`);
    });
    
    clusterManager.on('node-removed', (nodeId) => {
      console.log(`节点离线: ${nodeId}`);
      // 可以在这里重新分配任务
    });
    
  } catch (err) {
    console.error('集群初始化失败，继续以单机模式运行:', err.message);
  }
  
  // 定期更新 Prometheus 指标（每 30 秒）
  setInterval(() => {
    // 更新设备指标
    db.getDevices((err, devices) => {
      if (!err && devices) {
        prometheusExporter.updateDeviceMetrics(devices);
      }
    });
    
    // 更新告警指标
    const alarms = alarmManager.getActiveAlarms();
    if (alarms) {
      prometheusExporter.updateAlarmMetrics(alarms);
    }
    
    // 更新时间同步状态
    const timeSyncHealth = timeSyncMonitor.getHealthStatus();
    prometheusExporter.updateTimeSyncStatus(
      timeSync.config.source,
      timeSyncHealth.status === 'healthy'
    );
    
    // 更新 NTP 服务器状态
    prometheusExporter.updateNTPServerStatus(ntpServer.isRunning);
    
    // 更新 WebSocket 连接数
    prometheusExporter.updateWebSocketConnections(wss.clients.size);
  }, 30000);

  server.listen(PORT, async () => {
    console.log(`========================================`);
    console.log(`Modbus RTU Manager 服务器已启动`);
    console.log(`========================================`);
    console.log(`运行模式: ${clusterConfig.enabled ? '集群模式' : '单机模式'}`);
    if (clusterConfig.enabled) {
      console.log(`节点ID: ${clusterConfig.node.id}`);
      console.log(`节点角色: ${clusterConfig.node.role}`);
    }
    console.log(`数据库类型: ${dbConfig.type.toUpperCase()}`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log(`========================================`);
  });
});

// 添加集群状态 API
app.get('/api/cluster/status', async (req, res) => {
  try {
    const stats = await clusterManager.getClusterStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cluster/nodes', async (req, res) => {
  try {
    const nodes = await clusterManager.getActiveNodes();
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 备份和还原 API
app.post('/api/backup/create', async (req, res) => {
  try {
    let result;
    
    switch (dbConfig.type) {
      case 'sqlite':
        result = await backupManager.backupSQLite(dbConfig.sqlite.filename);
        break;
      case 'mysql':
        result = await backupManager.backupMySQL(dbConfig.mysql);
        break;
      case 'postgresql':
        result = await backupManager.backupPostgreSQL(dbConfig.postgresql);
        break;
      default:
        throw new Error('不支持的数据库类型');
    }
    
    // 同时备份配置
    const configBackup = await backupManager.backupConfig();
    
    // 清理旧备份
    backupManager.cleanOldBackups();
    
    res.json({
      success: true,
      database: result,
      config: configBackup
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backup/list', (req, res) => {
  try {
    const backups = backupManager.listBackups();
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backup/:name', (req, res) => {
  try {
    const info = backupManager.getBackupInfo(req.params.name);
    res.json(info);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post('/api/backup/restore/:name', async (req, res) => {
  try {
    const backupPath = path.join(backupManager.backupDir, req.params.name);
    let result;
    
    switch (dbConfig.type) {
      case 'sqlite':
        result = await backupManager.restoreSQLite(backupPath, dbConfig.sqlite.filename);
        break;
      case 'mysql':
        result = await backupManager.restoreMySQL(backupPath, dbConfig.mysql);
        break;
      case 'postgresql':
        result = await backupManager.restorePostgreSQL(backupPath, dbConfig.postgresql);
        break;
      default:
        throw new Error('不支持的数据库类型');
    }
    
    res.json({
      success: true,
      message: '数据库还原成功，建议重启服务'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/backup/:name', (req, res) => {
  try {
    backupManager.deleteBackup(req.params.name);
    res.json({ success: true, message: '备份已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backup/download/:name', (req, res) => {
  try {
    const backupPath = path.join(backupManager.backupDir, req.params.name);
    res.download(backupPath);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// 告警规则管理 API
app.get('/api/alarms/rules', (req, res) => {
  db.getAlarmRules((err, rules) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rules);
  });
});

app.post('/api/alarms/rules', async (req, res) => {
  const rule = req.body;
  db.addAlarmRule(rule, async (err, id) => {
    if (err) return res.status(500).json({ error: err.message });
    await alarmManager.loadAlarmRules();
    res.json({ id, message: '告警规则添加成功' });
  });
});

app.put('/api/alarms/rules/:id', async (req, res) => {
  const { id } = req.params;
  const rule = req.body;
  db.updateAlarmRule(id, rule, async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    await alarmManager.loadAlarmRules();
    res.json({ message: '告警规则更新成功' });
  });
});

app.delete('/api/alarms/rules/:id', async (req, res) => {
  const { id } = req.params;
  db.deleteAlarmRule(id, async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    await alarmManager.loadAlarmRules();
    res.json({ message: '告警规则删除成功' });
  });
});

// 告警状态 API
app.get('/api/alarms/active', (req, res) => {
  const alarms = alarmManager.getActiveAlarms();
  res.json(alarms);
});

app.get('/api/alarms/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const history = alarmManager.getAlarmHistory(limit);
  res.json(history);
});

app.get('/api/alarms/stats', (req, res) => {
  const stats = alarmManager.getAlarmStats();
  res.json(stats);
});

app.post('/api/alarms/acknowledge/:deviceId/:ruleId', (req, res) => {
  const { deviceId, ruleId } = req.params;
  const alarmKey = `${deviceId}-${ruleId}`;
  const success = alarmManager.acknowledgeAlarm(alarmKey);
  
  if (success) {
    res.json({ message: '告警已确认' });
  } else {
    res.status(404).json({ error: '告警不存在' });
  }
});

app.post('/api/alarms/clear', (req, res) => {
  alarmManager.clearAllAlarms();
  res.json({ message: '所有告警已清除' });
});

// 通知配置 API
app.get('/api/notifications/config', (req, res) => {
  db.getNotificationConfig((err, configs) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const configMap = {};
    configs.forEach(cfg => {
      configMap[cfg.type] = {
        enabled: cfg.enabled === 1,
        ...cfg.config
      };
    });
    
    res.json(configMap);
  });
});

app.post('/api/notifications/config/:type', (req, res) => {
  const { type } = req.params;
  const { enabled, ...config } = req.body;
  
  db.saveNotificationConfig(type, enabled, config, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // 更新通知管理器配置
    if (notificationManager) {
      const newConfig = { [type]: { enabled, ...config } };
      notificationManager.updateConfig(newConfig);
    }
    
    res.json({ message: '通知配置已保存' });
  });
});

app.post('/api/notifications/test', async (req, res) => {
  const { type } = req.body;
  
  if (!notificationManager) {
    return res.status(500).json({ error: '通知管理器未初始化' });
  }
  
  // 创建测试告警
  const testAlarm = {
    id: Date.now(),
    ruleId: 0,
    ruleName: '测试告警',
    deviceId: 0,
    deviceName: '测试设备',
    value: 99.99,
    threshold: 80,
    condition: 'gt',
    level: 'warning',
    message: '这是一条测试告警消息',
    triggeredAt: Date.now(),
    acknowledged: false
  };
  
  try {
    const notificationConfig = {
      email: type === 'email' ? req.body.testRecipients : null,
      sms: type === 'sms' ? req.body.testRecipients : null,
      wecom: type === 'wecom',
      dingtalk: type === 'dingtalk'
    };
    
    await notificationManager.sendAlarmNotification(testAlarm, notificationConfig);
    res.json({ message: '测试通知已发送' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 系统设置 API
app.get('/api/system/settings', (req, res) => {
  db.getSystemSettings((err, settings) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // 合并默认配置
    const config = {
      systemName: settings.systemName || systemConfig.name,
      systemTitle: settings.systemTitle || systemConfig.title,
      systemDescription: settings.systemDescription || systemConfig.description,
      systemLogo: settings.systemLogo || systemConfig.logo,
      primaryColor: settings.primaryColor || systemConfig.primaryColor,
      timezone: settings.timezone || 'Asia/Shanghai',
      timeFormat: settings.timeFormat || '24h',
      dateFormat: settings.dateFormat || 'YYYY-MM-DD',
      autoSyncTime: settings.autoSyncTime || 'false'
    };
    
    res.json(config);
  });
});

app.get('/api/system/time', (req, res) => {
  const currentTime = timeSync.getCurrentTime();
  const status = timeSync.getStatus();
  
  res.json({
    serverTime: currentTime.getTime(),
    currentTime: currentTime.toISOString(),
    timezone: process.env.TZ || 'Asia/Shanghai',
    offset: currentTime.getTimezoneOffset(),
    source: status.source,
    lastSync: status.lastSync,
    isGPSAvailable: status.isGPSAvailable
  });
});

// 时间同步管理 API
app.get('/api/time/status', (req, res) => {
  const status = timeSync.getStatus();
  res.json(status);
});

app.post('/api/time/sync', async (req, res) => {
  try {
    const time = await timeSync.syncTime();
    res.json({
      success: true,
      time: time.toISOString(),
      timestamp: time.getTime()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/time/source', async (req, res) => {
  const { source } = req.body;
  
  if (!['local', 'gps', 'gps-pps', 'ntp'].includes(source)) {
    return res.status(400).json({ error: '无效的时间源' });
  }
  
  try {
    await timeSync.switchSource(source);
    
    // 同步更新 NTP 服务器的时钟源
    if (ntpServer.isRunning) {
      ntpServer.updateClockSource(source);
    }
    
    res.json({
      success: true,
      source: source,
      time: timeSync.getCurrentTime().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NTP 服务器管理 API
app.get('/api/ntp/server/status', (req, res) => {
  const status = ntpServer.getStatus();
  res.json(status);
});

app.post('/api/ntp/server/start', async (req, res) => {
  try {
    if (ntpServer.isRunning) {
      return res.json({ message: 'NTP 服务器已在运行' });
    }
    
    await ntpServer.start();
    res.json({
      success: true,
      message: 'NTP 服务器已启动',
      status: ntpServer.getStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ntp/server/stop', async (req, res) => {
  try {
    if (!ntpServer.isRunning) {
      return res.json({ message: 'NTP 服务器未运行' });
    }
    
    await ntpServer.stop();
    res.json({
      success: true,
      message: 'NTP 服务器已停止'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ntp/server/config', (req, res) => {
  const { clockSource, stratum } = req.body;
  
  if (clockSource) {
    ntpServer.updateClockSource(clockSource);
  }
  
  if (stratum) {
    ntpServer.config.stratum = parseInt(stratum);
  }
  
  res.json({
    success: true,
    config: {
      clockSource: ntpServer.config.clockSource,
      stratum: ntpServer.config.stratum
    }
  });
});

// 时间同步监控 API
app.get('/api/time/monitor/stats', (req, res) => {
  const stats = timeSyncMonitor.getStats();
  res.json(stats);
});

app.get('/api/time/monitor/health', (req, res) => {
  const health = timeSyncMonitor.getHealthStatus();
  res.json(health);
});

app.post('/api/time/monitor/reset', (req, res) => {
  timeSyncMonitor.reset();
  res.json({ success: true, message: '统计已重置' });
});

// 设备初始化工具 API
app.post('/api/device-initializer/test-connection', async (req, res) => {
  const { connectionConfig, registerMap } = req.body;
  const initializer = new ModbusDeviceInitializer();
  
  try {
    // 连接设备
    if (connectionConfig.type === 'rtu') {
      await initializer.connectRTU(
        connectionConfig.port,
        connectionConfig.baudRate,
        connectionConfig.slaveId
      );
    } else {
      await initializer.connectTCP(
        connectionConfig.ip,
        connectionConfig.port,
        connectionConfig.slaveId
      );
    }
    
    // 读取设备信息
    const deviceInfo = await initializer.readDeviceInfo(registerMap);
    
    await initializer.disconnect();
    
    res.json({
      success: true,
      message: '连接成功',
      deviceInfo
    });
  } catch (error) {
    await initializer.disconnect();
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/device-initializer/read-config', async (req, res) => {
  const { connectionConfig, registerMap } = req.body;
  const initializer = new ModbusDeviceInitializer();
  
  try {
    // 连接设备
    if (connectionConfig.type === 'rtu') {
      await initializer.connectRTU(
        connectionConfig.port,
        connectionConfig.baudRate,
        connectionConfig.slaveId
      );
    } else {
      await initializer.connectTCP(
        connectionConfig.ip,
        connectionConfig.port,
        connectionConfig.slaveId
      );
    }
    
    // 读取设备信息
    const deviceInfo = await initializer.readDeviceInfo(registerMap);
    
    await initializer.disconnect();
    
    res.json({
      success: true,
      deviceInfo
    });
  } catch (error) {
    await initializer.disconnect();
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/device-initializer/initialize', async (req, res) => {
  const { connectionConfig, deviceConfig } = req.body;
  const initializer = new ModbusDeviceInitializer();
  const logs = [];
  
  // 捕获日志
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.log = (...args) => {
    const message = args.join(' ');
    logs.push({ type: 'info', message });
    originalLog(...args);
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    logs.push({ type: 'error', message });
    originalError(...args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    logs.push({ type: 'warning', message });
    originalWarn(...args);
  };
  
  try {
    await initializer.initializeDevice(connectionConfig, deviceConfig);
    
    // 恢复原始 console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    
    res.json({
      success: true,
      message: '设备初始化完成',
      logs
    });
  } catch (error) {
    // 恢复原始 console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    
    res.status(500).json({
      error: error.message,
      logs
    });
  }
});

app.post('/api/system/settings', (req, res) => {
  const { key, value } = req.body;
  
  if (!key || value === undefined) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  db.saveSystemSetting(key, value, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '设置已保存' });
  });
});

app.post('/api/system/logo/upload', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  
  const logoPath = `/uploads/${req.file.filename}`;
  
  // 保存到数据库
  db.saveSystemSetting('systemLogo', logoPath, (err) => {
    if (err) {
      // 删除上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      message: 'Logo上传成功',
      path: logoPath
    });
  });
});

app.post('/api/system/logo/reset', (req, res) => {
  db.saveSystemSetting('systemLogo', systemConfig.logo, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Logo已重置为默认' });
  });
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  modbusManager.stopCollection();
  await clusterManager.close();
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n正在关闭服务器...');
  modbusManager.stopCollection();
  await clusterManager.close();
  await db.close();
  process.exit(0);
});
