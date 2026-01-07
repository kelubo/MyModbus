// NTP 服务器
// 支持使用 GPS 或本地时钟作为时钟源
const dgram = require('dgram');
const EventEmitter = require('events');

class NTPServer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      port: config.port || 123,
      clockSource: config.clockSource || 'local', // local, gps, gps-pps
      stratum: config.stratum || 1, // NTP 层级（1=主时钟源）
      precision: config.precision || -20, // 精度（2^-20 秒）
      ...config
    };
    
    this.server = null;
    this.timeSync = null;
    this.isRunning = false;
    this.requestCount = 0;
    this.lastRequestTime = null;
  }

  // 设置时间同步管理器
  setTimeSync(timeSync) {
    this.timeSync = timeSync;
  }

  // 启动 NTP 服务器
  async start() {
    if (this.isRunning) {
      console.log('NTP 服务器已在运行');
      return;
    }

    try {
      this.server = dgram.createSocket('udp4');

      this.server.on('message', (msg, rinfo) => {
        this.handleRequest(msg, rinfo);
      });

      this.server.on('error', (err) => {
        console.error('NTP 服务器错误:', err);
        this.emit('error', err);
      });

      this.server.on('listening', () => {
        const address = this.server.address();
        console.log(`🕐 NTP 服务器启动成功: ${address.address}:${address.port}`);
        console.log(`   时钟源: ${this.config.clockSource}`);
        console.log(`   层级: ${this.config.stratum}`);
        this.isRunning = true;
        this.emit('started');
      });

      this.server.bind(this.config.port);
    } catch (error) {
      console.error('NTP 服务器启动失败:', error.message);
      throw error;
    }
  }

  // 停止 NTP 服务器
  async stop() {
    if (!this.isRunning) {
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('NTP 服务器已停止');
        this.isRunning = false;
        this.emit('stopped');
        resolve();
      });
    });
  }

  // 处理 NTP 请求
  handleRequest(msg, rinfo) {
    try {
      // 验证 NTP 数据包长度
      if (msg.length < 48) {
        console.warn(`无效的 NTP 请求长度: ${msg.length} 字节`);
        return;
      }

      // 解析 NTP 请求
      const request = this.parseNTPPacket(msg);
      
      // 记录请求
      this.requestCount++;
      this.lastRequestTime = Date.now();
      
      // 获取当前时间
      const currentTime = this.getCurrentTime();
      
      // 构建 NTP 响应
      const response = this.buildNTPResponse(request, currentTime);
      
      // 发送响应
      this.server.send(response, rinfo.port, rinfo.address, (err) => {
        if (err) {
          console.error('发送 NTP 响应失败:', err);
        } else {
          this.emit('request', {
            client: `${rinfo.address}:${rinfo.port}`,
            time: currentTime,
            count: this.requestCount
          });
        }
      });
    } catch (error) {
      console.error('处理 NTP 请求失败:', error);
    }
  }

  // 解析 NTP 数据包
  parseNTPPacket(msg) {
    return {
      leapIndicator: (msg[0] >> 6) & 0x3,
      version: (msg[0] >> 3) & 0x7,
      mode: msg[0] & 0x7,
      stratum: msg[1],
      poll: msg[2],
      precision: msg[3],
      rootDelay: msg.readInt32BE(4),
      rootDispersion: msg.readUInt32BE(8),
      referenceId: msg.readUInt32BE(12),
      referenceTimestamp: this.readTimestamp(msg, 16),
      originateTimestamp: this.readTimestamp(msg, 24),
      receiveTimestamp: this.readTimestamp(msg, 32),
      transmitTimestamp: this.readTimestamp(msg, 40)
    };
  }

  // 构建 NTP 响应
  buildNTPResponse(request, currentTime) {
    const response = Buffer.alloc(48);
    
    // 清零
    response.fill(0);
    
    // LI (2 bits) + VN (3 bits) + Mode (3 bits)
    // LI = 0 (无警告), VN = 4 (NTP v4), Mode = 4 (服务器)
    response[0] = (0 << 6) | (4 << 3) | 4;
    
    // Stratum（层级）
    response[1] = this.getStratum();
    
    // Poll（轮询间隔）
    response[2] = request.poll || 6; // 2^6 = 64 秒
    
    // Precision（精度）
    response[3] = this.getPrecision();
    
    // Root Delay（根延迟）
    response.writeInt32BE(0, 4);
    
    // Root Dispersion（根离散）
    response.writeUInt32BE(0, 8);
    
    // Reference ID（参考标识）
    this.writeReferenceId(response, 12);
    
    // Reference Timestamp（参考时间戳）
    this.writeTimestamp(response, 16, currentTime);
    
    // Originate Timestamp（客户端发送时间）
    this.writeTimestamp(response, 24, request.transmitTimestamp);
    
    // Receive Timestamp（服务器接收时间）
    this.writeTimestamp(response, 32, currentTime);
    
    // Transmit Timestamp（服务器发送时间）
    this.writeTimestamp(response, 40, currentTime);
    
    return response;
  }

  // 读取 NTP 时间戳
  readTimestamp(buffer, offset) {
    const seconds = buffer.readUInt32BE(offset);
    const fraction = buffer.readUInt32BE(offset + 4);
    
    // NTP 时间戳从 1900-01-01 开始
    // JavaScript 时间戳从 1970-01-01 开始
    // 差值：70 年 = 2208988800 秒
    const ntpEpochOffset = 2208988800;
    
    const unixSeconds = seconds - ntpEpochOffset;
    const milliseconds = Math.round((fraction / 0x100000000) * 1000);
    
    return new Date(unixSeconds * 1000 + milliseconds);
  }

  // 写入 NTP 时间戳
  writeTimestamp(buffer, offset, date) {
    const ntpEpochOffset = 2208988800;
    
    const unixSeconds = Math.floor(date.getTime() / 1000);
    const milliseconds = date.getTime() % 1000;
    
    const seconds = unixSeconds + ntpEpochOffset;
    const fraction = Math.round((milliseconds / 1000) * 0x100000000);
    
    buffer.writeUInt32BE(seconds, offset);
    buffer.writeUInt32BE(fraction, offset + 4);
  }

  // 写入参考标识
  writeReferenceId(buffer, offset) {
    // 根据时钟源设置参考标识
    let refId;
    
    switch (this.config.clockSource) {
      case 'gps':
      case 'gps-pps':
        // GPS 参考标识
        refId = Buffer.from('GPS\0');
        break;
      case 'local':
      default:
        // 本地时钟参考标识
        refId = Buffer.from('LOCL');
        break;
    }
    
    refId.copy(buffer, offset);
  }

  // 获取层级
  getStratum() {
    // 如果使用 GPS 作为时钟源，层级为 1（主时钟源）
    if (this.config.clockSource === 'gps' || this.config.clockSource === 'gps-pps') {
      return 1;
    }
    
    // 本地时钟层级为 10（不太可靠）
    return this.config.stratum || 10;
  }

  // 获取精度
  getPrecision() {
    // 根据时钟源返回不同精度
    switch (this.config.clockSource) {
      case 'gps-pps':
        return -20; // 2^-20 ≈ 1 微秒
      case 'gps':
        return -10; // 2^-10 ≈ 1 毫秒
      case 'local':
      default:
        return -6;  // 2^-6 ≈ 16 毫秒
    }
  }

  // 获取当前时间
  getCurrentTime() {
    if (this.timeSync) {
      // 从时间同步管理器获取时间
      return this.timeSync.getCurrentTime();
    }
    
    // 降级到本地时间
    return new Date();
  }

  // 获取服务器状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      clockSource: this.config.clockSource,
      stratum: this.getStratum(),
      precision: this.getPrecision(),
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime ? new Date(this.lastRequestTime) : null
    };
  }

  // 更新时钟源
  updateClockSource(clockSource) {
    console.log(`NTP 服务器时钟源切换: ${this.config.clockSource} -> ${clockSource}`);
    this.config.clockSource = clockSource;
    this.emit('clock-source-changed', clockSource);
  }
}

module.exports = NTPServer;
