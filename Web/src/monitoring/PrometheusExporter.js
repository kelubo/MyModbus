// Prometheus 监控指标导出器
const client = require('prom-client');

class PrometheusExporter {
  constructor() {
    // 创建注册表
    this.register = new client.Registry();
    
    // 添加默认指标（CPU、内存等）
    client.collectDefaultMetrics({
      register: this.register,
      prefix: 'modbus_rtu_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });
    
    // 自定义指标
    this.initCustomMetrics();
  }

  // 初始化自定义指标
  initCustomMetrics() {
    // 设备相关指标
    this.deviceTotal = new client.Gauge({
      name: 'modbus_devices_total',
      help: 'Total number of Modbus devices',
      labelNames: ['type', 'status'],
      registers: [this.register]
    });

    this.deviceOnline = new client.Gauge({
      name: 'modbus_devices_online',
      help: 'Number of online Modbus devices',
      registers: [this.register]
    });

    this.deviceOffline = new client.Gauge({
      name: 'modbus_devices_offline',
      help: 'Number of offline Modbus devices',
      registers: [this.register]
    });

    // 数据采集指标
    this.dataCollectionTotal = new client.Counter({
      name: 'modbus_data_collection_total',
      help: 'Total number of data collections',
      labelNames: ['device_id', 'status'],
      registers: [this.register]
    });

    this.dataCollectionDuration = new client.Histogram({
      name: 'modbus_data_collection_duration_seconds',
      help: 'Duration of data collection in seconds',
      labelNames: ['device_id'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register]
    });

    this.dataCollectionErrors = new client.Counter({
      name: 'modbus_data_collection_errors_total',
      help: 'Total number of data collection errors',
      labelNames: ['device_id', 'error_type'],
      registers: [this.register]
    });

    // 寄存器读写指标
    this.registerReads = new client.Counter({
      name: 'modbus_register_reads_total',
      help: 'Total number of register reads',
      labelNames: ['device_id', 'register_type'],
      registers: [this.register]
    });

    this.registerWrites = new client.Counter({
      name: 'modbus_register_writes_total',
      help: 'Total number of register writes',
      labelNames: ['device_id', 'register_type'],
      registers: [this.register]
    });

    // 告警指标
    this.activeAlarms = new client.Gauge({
      name: 'modbus_active_alarms',
      help: 'Number of active alarms',
      labelNames: ['level'],
      registers: [this.register]
    });

    this.alarmTriggered = new client.Counter({
      name: 'modbus_alarms_triggered_total',
      help: 'Total number of alarms triggered',
      labelNames: ['rule_id', 'level'],
      registers: [this.register]
    });

    // 时间同步指标
    this.timeSyncStatus = new client.Gauge({
      name: 'modbus_time_sync_status',
      help: 'Time synchronization status (1=healthy, 0=unhealthy)',
      labelNames: ['source'],
      registers: [this.register]
    });

    this.timeSyncTotal = new client.Counter({
      name: 'modbus_time_sync_total',
      help: 'Total number of time synchronizations',
      labelNames: ['source', 'status'],
      registers: [this.register]
    });

    this.timeSyncDuration = new client.Histogram({
      name: 'modbus_time_sync_duration_milliseconds',
      help: 'Duration of time synchronization in milliseconds',
      labelNames: ['source'],
      buckets: [10, 50, 100, 500, 1000, 5000, 10000],
      registers: [this.register]
    });

    this.timeSyncOffset = new client.Gauge({
      name: 'modbus_time_sync_offset_nanoseconds',
      help: 'Time synchronization offset in nanoseconds (PPS)',
      registers: [this.register]
    });

    // NTP 服务器指标
    this.ntpServerRequests = new client.Counter({
      name: 'modbus_ntp_server_requests_total',
      help: 'Total number of NTP server requests',
      labelNames: ['client_ip'],
      registers: [this.register]
    });

    this.ntpServerStatus = new client.Gauge({
      name: 'modbus_ntp_server_status',
      help: 'NTP server status (1=running, 0=stopped)',
      registers: [this.register]
    });

    // 集群指标
    this.clusterNodes = new client.Gauge({
      name: 'modbus_cluster_nodes',
      help: 'Number of cluster nodes',
      labelNames: ['status'],
      registers: [this.register]
    });

    this.clusterTasks = new client.Gauge({
      name: 'modbus_cluster_tasks',
      help: 'Number of cluster tasks',
      labelNames: ['node_id'],
      registers: [this.register]
    });

    // WebSocket 连接指标
    this.websocketConnections = new client.Gauge({
      name: 'modbus_websocket_connections',
      help: 'Number of active WebSocket connections',
      registers: [this.register]
    });

    // HTTP 请求指标
    this.httpRequests = new client.Counter({
      name: 'modbus_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.register]
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'modbus_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register]
    });

    // 数据库指标
    this.databaseQueries = new client.Counter({
      name: 'modbus_database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'status'],
      registers: [this.register]
    });

    this.databaseQueryDuration = new client.Histogram({
      name: 'modbus_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.register]
    });

    // 备份指标
    this.backupTotal = new client.Counter({
      name: 'modbus_backup_total',
      help: 'Total number of backups',
      labelNames: ['type', 'status'],
      registers: [this.register]
    });

    this.backupSize = new client.Gauge({
      name: 'modbus_backup_size_bytes',
      help: 'Size of last backup in bytes',
      labelNames: ['type'],
      registers: [this.register]
    });
  }

  // 更新设备指标
  updateDeviceMetrics(devices) {
    const rtuDevices = devices.filter(d => d.connection_type === 'rtu');
    const tcpDevices = devices.filter(d => d.connection_type === 'tcp');
    const onlineDevices = devices.filter(d => d.status === 'online');
    const offlineDevices = devices.filter(d => d.status === 'offline');

    this.deviceTotal.set({ type: 'rtu', status: 'all' }, rtuDevices.length);
    this.deviceTotal.set({ type: 'tcp', status: 'all' }, tcpDevices.length);
    this.deviceOnline.set(onlineDevices.length);
    this.deviceOffline.set(offlineDevices.length);
  }

  // 记录数据采集
  recordDataCollection(deviceId, duration, success = true) {
    this.dataCollectionTotal.inc({
      device_id: deviceId,
      status: success ? 'success' : 'failure'
    });

    if (success) {
      this.dataCollectionDuration.observe({ device_id: deviceId }, duration);
    }
  }

  // 记录数据采集错误
  recordDataCollectionError(deviceId, errorType) {
    this.dataCollectionErrors.inc({
      device_id: deviceId,
      error_type: errorType
    });
  }

  // 记录寄存器读取
  recordRegisterRead(deviceId, registerType) {
    this.registerReads.inc({
      device_id: deviceId,
      register_type: registerType
    });
  }

  // 记录寄存器写入
  recordRegisterWrite(deviceId, registerType) {
    this.registerWrites.inc({
      device_id: deviceId,
      register_type: registerType
    });
  }

  // 更新告警指标
  updateAlarmMetrics(alarms) {
    const criticalAlarms = alarms.filter(a => a.level === 'critical').length;
    const warningAlarms = alarms.filter(a => a.level === 'warning').length;
    const infoAlarms = alarms.filter(a => a.level === 'info').length;

    this.activeAlarms.set({ level: 'critical' }, criticalAlarms);
    this.activeAlarms.set({ level: 'warning' }, warningAlarms);
    this.activeAlarms.set({ level: 'info' }, infoAlarms);
  }

  // 记录告警触发
  recordAlarmTriggered(ruleId, level) {
    this.alarmTriggered.inc({
      rule_id: ruleId,
      level: level
    });
  }

  // 更新时间同步状态
  updateTimeSyncStatus(source, isHealthy) {
    this.timeSyncStatus.set({ source }, isHealthy ? 1 : 0);
  }

  // 记录时间同步
  recordTimeSync(source, duration, success = true) {
    this.timeSyncTotal.inc({
      source,
      status: success ? 'success' : 'failure'
    });

    if (success) {
      this.timeSyncDuration.observe({ source }, duration);
    }
  }

  // 更新 PPS 偏移
  updatePPSOffset(offset) {
    this.timeSyncOffset.set(offset);
  }

  // 记录 NTP 服务器请求
  recordNTPServerRequest(clientIp) {
    this.ntpServerRequests.inc({ client_ip: clientIp });
  }

  // 更新 NTP 服务器状态
  updateNTPServerStatus(isRunning) {
    this.ntpServerStatus.set(isRunning ? 1 : 0);
  }

  // 更新集群指标
  updateClusterMetrics(nodes, tasks) {
    const activeNodes = nodes.filter(n => n.status === 'active').length;
    const inactiveNodes = nodes.filter(n => n.status === 'inactive').length;

    this.clusterNodes.set({ status: 'active' }, activeNodes);
    this.clusterNodes.set({ status: 'inactive' }, inactiveNodes);

    // 更新每个节点的任务数
    Object.entries(tasks).forEach(([nodeId, taskCount]) => {
      this.clusterTasks.set({ node_id: nodeId }, taskCount);
    });
  }

  // 更新 WebSocket 连接数
  updateWebSocketConnections(count) {
    this.websocketConnections.set(count);
  }

  // 记录 HTTP 请求
  recordHTTPRequest(method, path, status, duration) {
    this.httpRequests.inc({
      method,
      path,
      status: status.toString()
    });

    this.httpRequestDuration.observe({ method, path }, duration);
  }

  // 记录数据库查询
  recordDatabaseQuery(operation, duration, success = true) {
    this.databaseQueries.inc({
      operation,
      status: success ? 'success' : 'failure'
    });

    if (success) {
      this.databaseQueryDuration.observe({ operation }, duration);
    }
  }

  // 记录备份
  recordBackup(type, size, success = true) {
    this.backupTotal.inc({
      type,
      status: success ? 'success' : 'failure'
    });

    if (success) {
      this.backupSize.set({ type }, size);
    }
  }

  // 获取指标（用于 /metrics 端点）
  async getMetrics() {
    return this.register.metrics();
  }

  // 获取内容类型
  getContentType() {
    return this.register.contentType;
  }

  // 重置所有指标
  reset() {
    this.register.resetMetrics();
  }
}

module.exports = PrometheusExporter;
