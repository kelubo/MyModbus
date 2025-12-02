// 分布式集群配置
module.exports = {
  // 是否启用分布式模式
  enabled: process.env.CLUSTER_ENABLED === 'true' || false,
  
  // 节点配置
  node: {
    id: process.env.NODE_ID || `node-${require('os').hostname()}-${process.pid}`,
    role: process.env.NODE_ROLE || 'worker', // master, worker, both
  },
  
  // Redis 配置（用于节点间通信）
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'modbus:',
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  },
  
  // 心跳配置
  heartbeat: {
    interval: 5000,  // 心跳间隔（毫秒）
    timeout: 15000   // 超时时间（毫秒）
  },
  
  // 任务分配策略
  taskAllocation: {
    strategy: process.env.TASK_STRATEGY || 'round-robin', // round-robin, least-loaded, hash
    rebalanceInterval: 30000  // 任务重新平衡间隔（毫秒）
  }
};
