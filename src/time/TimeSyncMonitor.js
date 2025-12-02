// 时间同步精度监控
const EventEmitter = require('events');

class TimeSyncMonitor extends EventEmitter {
  constructor(timeSync) {
    super();
    this.timeSync = timeSync;
    this.stats = {
      syncCount: 0,
      successCount: 0,
      failureCount: 0,
      lastSyncTime: null,
      lastSyncDuration: 0,
      averageSyncDuration: 0,
      syncHistory: []
    };
    
    this.maxHistorySize = 100;
  }

  // 开始监控
  start() {
    // 监听时间同步事件
    this.timeSync.on('time-synced', (data) => {
      this.recordSync(true, data);
    });
    
    this.timeSync.on('sync-failed', (error) => {
      this.recordSync(false, { error: error.message });
    });
    
    console.log('时间同步监控已启动');
  }

  // 记录同步事件
  recordSync(success, data) {
    this.stats.syncCount++;
    
    if (success) {
      this.stats.successCount++;
    } else {
      this.stats.failureCount++;
    }
    
    const record = {
      timestamp: Date.now(),
      success: success,
      source: data.source || 'unknown',
      duration: data.duration || 0,
      ppsOffset: data.ppsOffset,
      error: data.error
    };
    
    this.stats.lastSyncTime = record.timestamp;
    this.stats.lastSyncDuration = record.duration;
    
    // 添加到历史记录
    this.stats.syncHistory.push(record);
    
    // 限制历史记录大小
    if (this.stats.syncHistory.length > this.maxHistorySize) {
      this.stats.syncHistory.shift();
    }
    
    // 计算平均同步时长
    this.calculateAverageDuration();
    
    // 发出监控事件
    this.emit('sync-recorded', record);
  }

  // 计算平均同步时长
  calculateAverageDuration() {
    const successfulSyncs = this.stats.syncHistory.filter(r => r.success && r.duration > 0);
    
    if (successfulSyncs.length > 0) {
      const totalDuration = successfulSyncs.reduce((sum, r) => sum + r.duration, 0);
      this.stats.averageSyncDuration = Math.round(totalDuration / successfulSyncs.length);
    }
  }

  // 获取统计信息
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.syncCount > 0 
        ? Math.round((this.stats.successCount / this.stats.syncCount) * 100) 
        : 0,
      recentHistory: this.stats.syncHistory.slice(-10)
    };
  }

  // 获取健康状态
  getHealthStatus() {
    const stats = this.getStats();
    
    let status = 'healthy';
    let issues = [];
    
    // 检查成功率
    if (stats.successRate < 80) {
      status = 'warning';
      issues.push(`同步成功率较低: ${stats.successRate}%`);
    }
    
    // 检查最后同步时间
    if (stats.lastSyncTime) {
      const timeSinceLastSync = Date.now() - stats.lastSyncTime;
      const syncInterval = this.timeSync.config.syncInterval || 3600000;
      
      if (timeSinceLastSync > syncInterval * 2) {
        status = 'error';
        issues.push('长时间未同步');
      }
    }
    
    // 检查 PPS 精度（如果使用 GPS-PPS）
    if (this.timeSync.config.source === 'gps-pps') {
      const recentPPSRecords = stats.recentHistory.filter(r => r.ppsOffset !== undefined);
      
      if (recentPPSRecords.length > 0) {
        const avgPPSOffset = recentPPSRecords.reduce((sum, r) => sum + Math.abs(r.ppsOffset), 0) / recentPPSRecords.length;
        
        if (avgPPSOffset > 1000) { // > 1 微秒
          status = status === 'error' ? 'error' : 'warning';
          issues.push(`PPS 精度异常: ${Math.round(avgPPSOffset)} ns`);
        }
      }
    }
    
    return {
      status,
      issues,
      stats
    };
  }

  // 重置统计
  reset() {
    this.stats = {
      syncCount: 0,
      successCount: 0,
      failureCount: 0,
      lastSyncTime: null,
      lastSyncDuration: 0,
      averageSyncDuration: 0,
      syncHistory: []
    };
    
    console.log('时间同步统计已重置');
  }
}

module.exports = TimeSyncMonitor;
