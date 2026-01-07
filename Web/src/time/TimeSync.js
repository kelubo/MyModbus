// 时间同步管理器
const EventEmitter = require('events');

class TimeSync extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      source: config.source || 'local', // local, gps, gps-pps, ntp
      gpsPort: config.gpsPort || '/dev/ttyUSB0',
      gpsBaudRate: config.gpsBaudRate || 9600,
      ppsDevice: config.ppsDevice || '/dev/pps0',
      enablePPS: config.enablePPS || false,
      ntpServer: config.ntpServer || 'pool.ntp.org',
      syncInterval: config.syncInterval || 3600000, // 1小时
      ...config
    };
    
    this.currentTime = null;
    this.lastSync = null;
    this.syncTimer = null;
    this.gpsClient = null;
    this.ppsWatcher = null;
    this.isGPSAvailable = false;
    this.isPPSAvailable = false;
    this.ppsOffset = 0; // PPS 时间偏移（纳秒）
  }

  // 初始化时间同步
  async init() {
    console.log(`时间同步管理器初始化 - 时间源: ${this.config.source}`);
    
    if (this.config.source === 'gps' || this.config.source === 'gps-pps') {
      await this.initGPS();
      
      if (this.config.source === 'gps-pps' || this.config.enablePPS) {
        await this.initPPS();
      }
    }
    
    // 立即同步一次
    await this.syncTime();
    
    // 启动定期同步
    this.startPeriodicSync();
  }

  // 初始化 GPS
  async initGPS() {
    try {
      const SerialPort = require('serialport');
      const Readline = require('@serialport/parser-readline');
      
      this.gpsClient = new SerialPort({
        path: this.config.gpsPort,
        baudRate: this.config.gpsBaudRate
      });
      
      const parser = this.gpsClient.pipe(new Readline({ delimiter: '\r\n' }));
      
      parser.on('data', (line) => {
        this.parseNMEA(line);
      });
      
      this.gpsClient.on('error', (err) => {
        console.error('GPS 错误:', err.message);
        this.isGPSAvailable = false;
        this.emit('gps-error', err);
      });
      
      this.gpsClient.on('open', () => {
        console.log('GPS 连接成功');
        this.isGPSAvailable = true;
        this.emit('gps-connected');
      });
      
    } catch (error) {
      console.error('GPS 初始化失败:', error.message);
      console.log('降级到本地时钟');
      this.config.source = 'local';
    }
  }

  // 解析 NMEA 数据
  parseNMEA(sentence) {
    if (!sentence.startsWith('$')) return;
    
    // 解析 GPRMC 或 GNRMC (推荐最小定位信息)
    if (sentence.includes('RMC')) {
      const parts = sentence.split(',');
      
      if (parts.length < 10) return;
      
      const timeStr = parts[1]; // HHMMSS.sss
      const dateStr = parts[9]; // DDMMYY
      const status = parts[2];  // A=有效, V=无效
      
      if (status !== 'A' || !timeStr || !dateStr) return;
      
      try {
        // 解析时间
        const hours = parseInt(timeStr.substring(0, 2));
        const minutes = parseInt(timeStr.substring(2, 4));
        const seconds = parseInt(timeStr.substring(4, 6));
        
        // 解析日期
        const day = parseInt(dateStr.substring(0, 2));
        const month = parseInt(dateStr.substring(2, 4)) - 1; // 月份从0开始
        const year = 2000 + parseInt(dateStr.substring(4, 6));
        
        // 创建 UTC 时间
        const gpsTime = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
        
        this.currentTime = gpsTime;
        this.lastSync = Date.now();
        
        this.emit('time-updated', {
          source: 'gps',
          time: gpsTime,
          timestamp: this.lastSync
        });
        
      } catch (error) {
        console.error('GPS 时间解析失败:', error.message);
      }
    }
  }

  // 初始化 PPS
  async initPPS() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 检查 PPS 设备是否存在
      if (!fs.existsSync(this.config.ppsDevice)) {
        console.warn(`PPS 设备不存在: ${this.config.ppsDevice}`);
        console.log('提示: 确保 GPS 模块的 PPS 引脚已连接到系统 GPIO');
        console.log('提示: 加载 pps-gpio 内核模块: sudo modprobe pps-gpio');
        return;
      }
      
      // 使用 pps-tools 监控 PPS 信号
      this.startPPSMonitor();
      
      this.isPPSAvailable = true;
      console.log('PPS 初始化成功');
      this.emit('pps-connected');
      
    } catch (error) {
      console.error('PPS 初始化失败:', error.message);
      this.isPPSAvailable = false;
    }
  }

  // 启动 PPS 监控
  startPPSMonitor() {
    const { spawn } = require('child_process');
    
    try {
      // 使用 ppstest 或 ppswatch 监控 PPS 信号
      this.ppsWatcher = spawn('ppstest', [this.config.ppsDevice]);
      
      this.ppsWatcher.stdout.on('data', (data) => {
        this.parsePPSData(data.toString());
      });
      
      this.ppsWatcher.stderr.on('data', (data) => {
        console.error('PPS 监控错误:', data.toString());
      });
      
      this.ppsWatcher.on('error', (error) => {
        console.error('PPS 监控进程错误:', error.message);
        this.isPPSAvailable = false;
        
        // 如果 ppstest 不可用，尝试直接读取 PPS 设备
        this.startPPSDirectRead();
      });
      
      this.ppsWatcher.on('close', (code) => {
        if (code !== 0) {
          console.log(`PPS 监控进程退出，代码: ${code}`);
          this.isPPSAvailable = false;
        }
      });
      
    } catch (error) {
      console.error('启动 PPS 监控失败:', error.message);
      this.startPPSDirectRead();
    }
  }

  // 直接读取 PPS 设备（备用方案）
  startPPSDirectRead() {
    const fs = require('fs');
    
    try {
      // 定期检查 PPS 设备状态
      this.ppsReadTimer = setInterval(() => {
        try {
          const ppsPath = `/sys/class/pps/pps0`;
          if (fs.existsSync(ppsPath)) {
            const assertPath = `${ppsPath}/assert`;
            if (fs.existsSync(assertPath)) {
              const data = fs.readFileSync(assertPath, 'utf8');
              this.parsePPSAssert(data);
            }
          }
        } catch (error) {
          // 忽略读取错误
        }
      }, 1000);
      
    } catch (error) {
      console.error('PPS 直接读取失败:', error.message);
    }
  }

  // 解析 PPS 数据
  parsePPSData(data) {
    // ppstest 输出格式: source 0 - assert 1638360000.123456789, sequence: 123
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.includes('assert')) {
        const match = line.match(/assert\s+([\d.]+)/);
        if (match) {
          const timestamp = parseFloat(match[1]);
          const seconds = Math.floor(timestamp);
          const nanoseconds = Math.round((timestamp - seconds) * 1e9);
          
          this.handlePPSPulse(seconds, nanoseconds);
        }
      }
    }
  }

  // 解析 PPS assert 文件
  parsePPSAssert(data) {
    // assert 文件格式: 1638360000.123456789#123
    const match = data.match(/([\d.]+)#(\d+)/);
    if (match) {
      const timestamp = parseFloat(match[1]);
      const seconds = Math.floor(timestamp);
      const nanoseconds = Math.round((timestamp - seconds) * 1e9);
      
      this.handlePPSPulse(seconds, nanoseconds);
    }
  }

  // 处理 PPS 脉冲
  handlePPSPulse(seconds, nanoseconds) {
    // PPS 脉冲表示精确的秒边界
    const ppsTime = new Date(seconds * 1000);
    const systemTime = Date.now();
    
    // 计算系统时间与 PPS 时间的偏移（纳秒）
    this.ppsOffset = nanoseconds;
    
    // 如果有 GPS 时间，使用 PPS 校准
    if (this.currentTime) {
      // 使用 PPS 信号校准当前时间
      const calibratedTime = new Date(ppsTime.getTime());
      
      // 更新时间
      this.currentTime = calibratedTime;
      this.lastSync = systemTime;
      
      this.emit('pps-pulse', {
        time: calibratedTime,
        offset: this.ppsOffset,
        timestamp: systemTime
      });
    }
  }

  // 同步时间
  async syncTime() {
    try {
      let time;
      
      switch (this.config.source) {
        case 'gps':
          time = await this.getGPSTime();
          break;
        case 'gps-pps':
          time = await this.getGPSPPSTime();
          break;
        case 'ntp':
          time = await this.getNTPTime();
          break;
        case 'local':
        default:
          time = this.getLocalTime();
          break;
      }
      
      this.currentTime = time;
      this.lastSync = Date.now();
      
      this.emit('time-synced', {
        source: this.config.source,
        time: time,
        timestamp: this.lastSync,
        ppsOffset: this.ppsOffset
      });
      
      return time;
      
    } catch (error) {
      console.error('时间同步失败:', error.message);
      // 降级到本地时间
      this.currentTime = this.getLocalTime();
      return this.currentTime;
    }
  }

  // 获取 GPS 时间
  async getGPSTime() {
    if (!this.isGPSAvailable) {
      throw new Error('GPS 不可用');
    }
    
    // 如果最近同步过（5秒内），直接返回
    if (this.currentTime && (Date.now() - this.lastSync) < 5000) {
      return this.currentTime;
    }
    
    // 等待 GPS 数据更新
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('GPS 时间获取超时'));
      }, 10000);
      
      const handler = (data) => {
        clearTimeout(timeout);
        this.removeListener('time-updated', handler);
        resolve(data.time);
      };
      
      this.once('time-updated', handler);
    });
  }

  // 获取 GPS + PPS 时间（高精度）
  async getGPSPPSTime() {
    if (!this.isGPSAvailable) {
      throw new Error('GPS 不可用');
    }
    
    if (!this.isPPSAvailable) {
      console.warn('PPS 不可用，降级到 GPS 时间');
      return this.getGPSTime();
    }
    
    // 先获取 GPS 粗略时间
    const gpsTime = await this.getGPSTime();
    
    // 等待 PPS 脉冲校准
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // 超时则返回 GPS 时间
        console.warn('PPS 脉冲等待超时，使用 GPS 时间');
        resolve(gpsTime);
      }, 2000);
      
      const handler = (data) => {
        clearTimeout(timeout);
        this.removeListener('pps-pulse', handler);
        resolve(data.time);
      };
      
      this.once('pps-pulse', handler);
    });
  }

  // 获取 NTP 时间
  async getNTPTime() {
    try {
      const ntpClient = require('ntp-client');
      
      return new Promise((resolve, reject) => {
        ntpClient.getNetworkTime(this.config.ntpServer, 123, (err, date) => {
          if (err) {
            reject(err);
          } else {
            resolve(date);
          }
        });
      });
    } catch (error) {
      console.error('NTP 时间获取失败:', error.message);
      throw error;
    }
  }

  // 获取本地时间
  getLocalTime() {
    return new Date();
  }

  // 获取当前时间
  getCurrentTime() {
    // 如果有同步的时间，计算偏移后返回
    if (this.currentTime && this.lastSync) {
      const offset = Date.now() - this.lastSync;
      return new Date(this.currentTime.getTime() + offset);
    }
    
    // 否则返回本地时间
    return this.getLocalTime();
  }

  // 启动定期同步
  startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      this.syncTime();
    }, this.config.syncInterval);
  }

  // 停止定期同步
  stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // 获取同步状态
  getStatus() {
    return {
      source: this.config.source,
      currentTime: this.getCurrentTime(),
      lastSync: this.lastSync ? new Date(this.lastSync) : null,
      isGPSAvailable: this.isGPSAvailable,
      isPPSAvailable: this.isPPSAvailable,
      ppsOffset: this.ppsOffset,
      syncInterval: this.config.syncInterval
    };
  }

  // 切换时间源
  async switchSource(newSource) {
    console.log(`切换时间源: ${this.config.source} -> ${newSource}`);
    
    const oldSource = this.config.source;
    this.config.source = newSource;
    
    if ((newSource === 'gps' || newSource === 'gps-pps') && !this.gpsClient) {
      await this.initGPS();
    }
    
    if (newSource === 'gps-pps' && !this.isPPSAvailable) {
      await this.initPPS();
    }
    
    await this.syncTime();
    
    this.emit('source-changed', {
      oldSource,
      newSource,
      time: this.currentTime
    });
  }

  // 关闭
  async close() {
    this.stopPeriodicSync();
    
    if (this.gpsClient && this.gpsClient.isOpen) {
      this.gpsClient.close();
    }
    
    if (this.ppsWatcher) {
      this.ppsWatcher.kill();
      this.ppsWatcher = null;
    }
    
    if (this.ppsReadTimer) {
      clearInterval(this.ppsReadTimer);
      this.ppsReadTimer = null;
    }
    
    console.log('时间同步管理器已关闭');
  }
}

module.exports = TimeSync;
