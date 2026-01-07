const EventEmitter = require('events');

class AlarmManager extends EventEmitter {
  constructor(db, notificationManager) {
    super();
    this.db = db;
    this.notificationManager = notificationManager;
    this.alarmRules = new Map();
    this.activeAlarms = new Map();
    this.alarmHistory = [];
    this.maxHistorySize = 1000;
  }

  // 初始化告警管理器
  async init() {
    await this.loadAlarmRules();
    console.log(`告警管理器已初始化，加载了 ${this.alarmRules.size} 条告警规则`);
  }

  // 加载告警规则
  async loadAlarmRules() {
    return new Promise((resolve, reject) => {
      this.db.getAlarmRules((err, rules) => {
        if (err) return reject(err);
        
        this.alarmRules.clear();
        rules.forEach(rule => {
          if (rule.enabled) {
            this.alarmRules.set(rule.id, rule);
          }
        });
        resolve();
      });
    });
  }

  // 检查数据是否触发告警
  checkAlarm(deviceId, deviceName, value, timestamp) {
    const deviceRules = Array.from(this.alarmRules.values())
      .filter(rule => rule.device_id === deviceId);

    deviceRules.forEach(rule => {
      const triggered = this.evaluateRule(rule, value);
      const alarmKey = `${deviceId}-${rule.id}`;

      if (triggered) {
        if (!this.activeAlarms.has(alarmKey)) {
          // 新告警触发
          const alarm = {
            id: Date.now(),
            ruleId: rule.id,
            ruleName: rule.name,
            deviceId,
            deviceName,
            value,
            threshold: this.getThresholdValue(rule),
            condition: rule.condition,
            level: rule.level,
            message: this.generateAlarmMessage(rule, deviceName, value),
            triggeredAt: timestamp,
            acknowledged: false
          };

          this.activeAlarms.set(alarmKey, alarm);
          this.addToHistory(alarm);
          this.emit('alarm-triggered', alarm);
          
          // 发送通知
          this.sendNotification(alarm, rule);
        }
      } else {
        if (this.activeAlarms.has(alarmKey)) {
          // 告警恢复
          const alarm = this.activeAlarms.get(alarmKey);
          alarm.recoveredAt = timestamp;
          alarm.recovered = true;
          
          this.activeAlarms.delete(alarmKey);
          this.emit('alarm-recovered', alarm);
        }
      }
    });
  }

  // 评估告警规则
  evaluateRule(rule, value) {
    const threshold = parseFloat(rule.threshold);
    const val = parseFloat(value);

    switch (rule.condition) {
      case 'gt': return val > threshold;
      case 'gte': return val >= threshold;
      case 'lt': return val < threshold;
      case 'lte': return val <= threshold;
      case 'eq': return val === threshold;
      case 'ne': return val !== threshold;
      default: return false;
    }
  }

  // 获取阈值显示值
  getThresholdValue(rule) {
    return parseFloat(rule.threshold);
  }

  // 生成告警消息
  generateAlarmMessage(rule, deviceName, value) {
    const conditionText = {
      'gt': '大于',
      'gte': '大于等于',
      'lt': '小于',
      'lte': '小于等于',
      'eq': '等于',
      'ne': '不等于'
    };

    return `设备 [${deviceName}] 的值 ${value.toFixed(2)} ${conditionText[rule.condition]} 阈值 ${rule.threshold}`;
  }

  // 添加到历史记录
  addToHistory(alarm) {
    this.alarmHistory.unshift(alarm);
    if (this.alarmHistory.length > this.maxHistorySize) {
      this.alarmHistory.pop();
    }
  }

  // 获取活动告警
  getActiveAlarms() {
    return Array.from(this.activeAlarms.values());
  }

  // 获取告警历史
  getAlarmHistory(limit = 100) {
    return this.alarmHistory.slice(0, limit);
  }

  // 确认告警
  acknowledgeAlarm(alarmKey) {
    if (this.activeAlarms.has(alarmKey)) {
      const alarm = this.activeAlarms.get(alarmKey);
      alarm.acknowledged = true;
      alarm.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // 清除所有告警
  clearAllAlarms() {
    this.activeAlarms.clear();
  }

  // 获取告警统计
  getAlarmStats() {
    const active = this.getActiveAlarms();
    const stats = {
      total: active.length,
      critical: active.filter(a => a.level === 'critical').length,
      warning: active.filter(a => a.level === 'warning').length,
      info: active.filter(a => a.level === 'info').length,
      acknowledged: active.filter(a => a.acknowledged).length,
      unacknowledged: active.filter(a => !a.acknowledged).length
    };
    return stats;
  }

  // 发送通知
  async sendNotification(alarm, rule) {
    if (!this.notificationManager) {
      return;
    }

    try {
      const notificationConfig = {
        email: rule.notification_email ? rule.notification_email.split(',').map(e => e.trim()) : null,
        sms: rule.notification_sms ? rule.notification_sms.split(',').map(p => p.trim()) : null,
        wecom: rule.notification_wecom === 1,
        dingtalk: rule.notification_dingtalk === 1
      };

      await this.notificationManager.sendAlarmNotification(alarm, notificationConfig);
    } catch (err) {
      console.error('发送告警通知失败:', err.message);
    }
  }
}

module.exports = AlarmManager;
