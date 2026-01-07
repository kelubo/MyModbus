// 集群管理器
const Redis = require('ioredis');
const EventEmitter = require('events');
const os = require('os');

class ClusterManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.nodeId = config.node.id;
    this.nodeRole = config.node.role;
    this.redis = null;
    this.subscriber = null;
    this.isConnected = false;
    this.nodes = new Map();
    this.heartbeatTimer = null;
    this.cleanupTimer = null;
  }

  async init() {
    if (!this.config.enabled) {
      console.log('集群模式未启用，运行在单机模式');
      return;
    }

    try {
      // 创建 Redis 连接
      this.redis = new Redis(this.config.redis);
      this.subscriber = new Redis(this.config.redis);

      // 监听连接事件
      this.redis.on('connect', () => {
        console.log(`✓ Redis 连接成功 (节点: ${this.nodeId})`);
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.error('Redis 连接错误:', err.message);
        this.isConnected = false;
      });

      // 订阅集群消息
      await this.subscriber.subscribe('cluster:broadcast', 'cluster:command');
      
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

      // 注册节点
      await this.registerNode();

      // 启动心跳
      this.startHeartbeat();

      // 启动清理任务
      this.startCleanup();

      console.log(`✓ 集群管理器初始化成功`);
      console.log(`  节点ID: ${this.nodeId}`);
      console.log(`  节点角色: ${this.nodeRole}`);
      
    } catch (err) {
      console.error('集群管理器初始化失败:', err);
      throw err;
    }
  }

  async registerNode() {
    const nodeInfo = {
      id: this.nodeId,
      role: this.nodeRole,
      hostname: os.hostname(),
      platform: os.platform(),
      cpus: os.cpus().length,
      memory: os.totalmem(),
      pid: process.pid,
      startTime: Date.now(),
      lastHeartbeat: Date.now()
    };

    await this.redis.hset(
      'cluster:nodes',
      this.nodeId,
      JSON.stringify(nodeInfo)
    );

    // 设置节点过期时间
    await this.redis.expire(`cluster:node:${this.nodeId}`, 30);

    console.log(`✓ 节点已注册: ${this.nodeId}`);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(async () => {
      try {
        const nodeInfo = {
          id: this.nodeId,
          role: this.nodeRole,
          lastHeartbeat: Date.now(),
          load: os.loadavg()[0],
          freeMem: os.freemem(),
          uptime: process.uptime()
        };

        await this.redis.hset(
          'cluster:nodes',
          this.nodeId,
          JSON.stringify(nodeInfo)
        );

        await this.redis.setex(
          `cluster:heartbeat:${this.nodeId}`,
          30,
          Date.now().toString()
        );

      } catch (err) {
        console.error('心跳发送失败:', err.message);
      }
    }, this.config.heartbeat.interval);
  }

  startCleanup() {
    this.cleanupTimer = setInterval(async () => {
      try {
        const nodes = await this.redis.hgetall('cluster:nodes');
        const now = Date.now();
        const timeout = this.config.heartbeat.timeout;

        for (const [nodeId, nodeData] of Object.entries(nodes)) {
          const node = JSON.parse(nodeData);
          if (now - node.lastHeartbeat > timeout) {
            console.log(`✗ 节点超时，移除: ${nodeId}`);
            await this.redis.hdel('cluster:nodes', nodeId);
            await this.redis.del(`cluster:heartbeat:${nodeId}`);
            this.emit('node-removed', nodeId);
          }
        }
      } catch (err) {
        console.error('清理任务失败:', err.message);
      }
    }, this.config.heartbeat.interval * 2);
  }

  async getActiveNodes() {
    if (!this.isConnected) return [];

    try {
      const nodes = await this.redis.hgetall('cluster:nodes');
      return Object.entries(nodes).map(([id, data]) => ({
        id,
        ...JSON.parse(data)
      }));
    } catch (err) {
      console.error('获取节点列表失败:', err);
      return [];
    }
  }

  async broadcast(event, data) {
    if (!this.isConnected) return;

    const message = JSON.stringify({
      from: this.nodeId,
      event,
      data,
      timestamp: Date.now()
    });

    await this.redis.publish('cluster:broadcast', message);
  }

  async sendCommand(targetNodeId, command, data) {
    if (!this.isConnected) return;

    const message = JSON.stringify({
      from: this.nodeId,
      to: targetNodeId,
      command,
      data,
      timestamp: Date.now()
    });

    await this.redis.publish('cluster:command', message);
  }

  handleMessage(channel, message) {
    try {
      const msg = JSON.parse(message);

      if (channel === 'cluster:broadcast') {
        if (msg.from !== this.nodeId) {
          this.emit('broadcast', msg);
        }
      } else if (channel === 'cluster:command') {
        if (msg.to === this.nodeId || msg.to === 'all') {
          this.emit('command', msg);
        }
      }
    } catch (err) {
      console.error('消息处理失败:', err);
    }
  }

  async assignTask(deviceId, taskData) {
    if (!this.isConnected) {
      // 单机模式，直接返回本节点
      return this.nodeId;
    }

    const strategy = this.config.taskAllocation.strategy;
    const nodes = await this.getActiveNodes();
    const workerNodes = nodes.filter(n => n.role === 'worker' || n.role === 'both');

    if (workerNodes.length === 0) {
      return this.nodeId;
    }

    let selectedNode;

    switch (strategy) {
      case 'round-robin':
        // 轮询分配
        const index = deviceId % workerNodes.length;
        selectedNode = workerNodes[index];
        break;

      case 'least-loaded':
        // 负载最低的节点
        selectedNode = workerNodes.reduce((min, node) => 
          (node.load || 0) < (min.load || 0) ? node : min
        );
        break;

      case 'hash':
        // 基于设备ID的哈希分配
        const hash = this.hashCode(deviceId.toString());
        selectedNode = workerNodes[Math.abs(hash) % workerNodes.length];
        break;

      default:
        selectedNode = workerNodes[0];
    }

    // 记录任务分配
    await this.redis.hset(
      'cluster:tasks',
      `device:${deviceId}`,
      JSON.stringify({
        nodeId: selectedNode.id,
        assignedAt: Date.now(),
        ...taskData
      })
    );

    return selectedNode.id;
  }

  async getTaskAssignment(deviceId) {
    if (!this.isConnected) return null;

    const taskData = await this.redis.hget('cluster:tasks', `device:${deviceId}`);
    return taskData ? JSON.parse(taskData) : null;
  }

  async removeTaskAssignment(deviceId) {
    if (!this.isConnected) return;
    await this.redis.hdel('cluster:tasks', `device:${deviceId}`);
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  async getClusterStats() {
    if (!this.isConnected) {
      return {
        mode: 'standalone',
        nodes: 1,
        currentNode: this.nodeId
      };
    }

    const nodes = await this.getActiveNodes();
    const tasks = await this.redis.hgetall('cluster:tasks');

    return {
      mode: 'cluster',
      nodes: nodes.length,
      currentNode: this.nodeId,
      activeNodes: nodes,
      totalTasks: Object.keys(tasks).length,
      taskDistribution: this.getTaskDistribution(tasks)
    };
  }

  getTaskDistribution(tasks) {
    const distribution = {};
    for (const taskData of Object.values(tasks)) {
      const task = JSON.parse(taskData);
      distribution[task.nodeId] = (distribution[task.nodeId] || 0) + 1;
    }
    return distribution;
  }

  async close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.isConnected) {
      await this.redis.hdel('cluster:nodes', this.nodeId);
      await this.redis.del(`cluster:heartbeat:${this.nodeId}`);
    }

    if (this.redis) {
      this.redis.disconnect();
    }

    if (this.subscriber) {
      this.subscriber.disconnect();
    }

    console.log(`✓ 节点已注销: ${this.nodeId}`);
  }
}

module.exports = ClusterManager;
