const ModbusRTU = require('modbus-serial');
const db = require('./database');

let collectionIntervals = {};
let clients = {};
let clusterManager = null;
let broadcastCallback = null;
let alarmManager = null;

function getClient(device) {
  const key = device.connection_type === 'tcp' 
    ? `tcp_${device.ip_address}_${device.tcp_port}` 
    : `rtu_${device.port}_${device.baudrate}`;
  
  if (!clients[key]) {
    clients[key] = new ModbusRTU();
  }
  return clients[key];
}

async function connectDevice(device) {
  const client = getClient(device);
  
  if (!client.isOpen) {
    try {
      if (device.connection_type === 'tcp') {
        await client.connectTCP(device.ip_address, { port: device.tcp_port });
        console.log(`已连接到TCP设备: ${device.ip_address}:${device.tcp_port}`);
      } else {
        await client.connectRTUBuffered(device.port, { baudRate: device.baudrate });
        console.log(`已连接到串口: ${device.port}`);
      }
    } catch (err) {
      console.error(`连接失败: ${err.message}`);
      throw err;
    }
  }
  
  client.setID(device.slave_id);
  return client;
}

async function readData(device) {
  try {
    const client = await connectDevice(device);
    let result;
    
    switch (device.data_type) {
      case 'coil':
        result = await client.readCoils(device.register_address, device.register_count);
        break;
      case 'discrete':
        result = await client.readDiscreteInputs(device.register_address, device.register_count);
        break;
      case 'input':
        result = await client.readInputRegisters(device.register_address, device.register_count);
        break;
      case 'holding':
      default:
        result = await client.readHoldingRegisters(device.register_address, device.register_count);
        break;
    }
    
    return result.data[0];
  } catch (err) {
    console.error(`读取设备 ${device.name} 失败:`, err.message);
    return null;
  }
}

function setClusterManager(manager) {
  clusterManager = manager;
}

function setAlarmManager(manager) {
  alarmManager = manager;
}

async function startCollection(broadcast) {
  broadcastCallback = broadcast;
  
  db.getDevices(async (err, devices) => {
    if (err) {
      console.error('获取设备列表失败:', err);
      return;
    }
    
    for (const device of devices) {
      if (!device.enabled) continue;
      
      // 检查是否在集群模式下
      if (clusterManager && clusterManager.isConnected) {
        // 分配任务到节点
        const assignedNode = await clusterManager.assignTask(device.id, {
          deviceName: device.name,
          connectionType: device.connection_type
        });
        
        // 只有分配给当前节点的设备才启动采集
        if (assignedNode !== clusterManager.nodeId) {
          console.log(`设备 ${device.name} 分配给节点: ${assignedNode}`);
          continue;
        }
      }
      
      if (collectionIntervals[device.id]) {
        clearInterval(collectionIntervals[device.id]);
      }
      
      collectionIntervals[device.id] = setInterval(async () => {
        const value = await readData(device);
        if (value !== null) {
          const timestamp = Date.now();
          
          db.saveData(device.id, value, (err) => {
            if (!err) {
              const dataMessage = {
                type: 'data',
                deviceId: device.id,
                deviceName: device.name,
                value: value,
                timestamp: timestamp,
                nodeId: clusterManager ? clusterManager.nodeId : 'standalone'
              };
              
              // 检查告警
              if (alarmManager) {
                alarmManager.checkAlarm(device.id, device.name, value, timestamp);
              }
              
              // 本地广播
              if (broadcast) {
                broadcast(dataMessage);
              }
              
              // 集群广播
              if (clusterManager && clusterManager.isConnected) {
                clusterManager.broadcast('device-data', dataMessage);
              }
            }
          });
        }
      }, device.interval);
      
      console.log(`✓ 已启动设备 ${device.name} 的数据采集 (节点: ${clusterManager ? clusterManager.nodeId : 'standalone'})`);
    }
  });
}

function handleClusterData(data) {
  // 处理来自其他节点的数据
  if (broadcastCallback) {
    broadcastCallback(data);
  }
}

function stopCollection() {
  Object.keys(collectionIntervals).forEach(id => {
    clearInterval(collectionIntervals[id]);
    delete collectionIntervals[id];
  });
  
  Object.keys(clients).forEach(key => {
    if (clients[key].isOpen) {
      clients[key].close(() => {});
    }
    delete clients[key];
  });
  
  console.log('已停止所有数据采集');
}

// 写入单个保持寄存器
async function writeSingleRegister(device, address, value) {
  try {
    const client = await connectDevice(device);
    await client.writeRegister(address, value);
    console.log(`写入寄存器成功: 地址=${address}, 值=${value}`);
    return true;
  } catch (err) {
    console.error(`写入寄存器失败:`, err.message);
    throw err;
  }
}

// 写入多个保持寄存器
async function writeMultipleRegisters(device, address, values) {
  try {
    const client = await connectDevice(device);
    await client.writeRegisters(address, values);
    console.log(`写入多个寄存器成功: 地址=${address}, 数量=${values.length}`);
    return true;
  } catch (err) {
    console.error(`写入多个寄存器失败:`, err.message);
    throw err;
  }
}

// 修改设备IP地址（将IP地址转换为寄存器值）
async function writeDeviceIP(device, newIP, ipRegisterAddress) {
  try {
    // 将IP地址转换为4个字节
    const ipParts = newIP.split('.').map(part => parseInt(part));
    if (ipParts.length !== 4 || ipParts.some(p => p < 0 || p > 255)) {
      throw new Error('无效的IP地址格式');
    }
    
    // 将4个字节转换为2个16位寄存器值
    // 例如: 192.168.1.100 -> [192*256+168, 1*256+100] = [49320, 356]
    const registers = [
      ipParts[0] * 256 + ipParts[1],
      ipParts[2] * 256 + ipParts[3]
    ];
    
    await writeMultipleRegisters(device, ipRegisterAddress, registers);
    console.log(`设备IP地址已更新为: ${newIP}`);
    return true;
  } catch (err) {
    console.error(`修改设备IP失败:`, err.message);
    throw err;
  }
}

module.exports = {
  startCollection,
  stopCollection,
  readData,
  writeSingleRegister,
  writeMultipleRegisters,
  writeDeviceIP,
  setClusterManager,
  setAlarmManager,
  handleClusterData
};
