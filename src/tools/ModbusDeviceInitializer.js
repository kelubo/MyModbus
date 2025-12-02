// Modbus 设备初始化工具
// 用于配置新的 Modbus 从节点设备

const ModbusRTU = require('modbus-serial');
const net = require('net');

class ModbusDeviceInitializer {
  constructor() {
    this.client = new ModbusRTU();
    this.isConnected = false;
  }

  // 连接到设备（RTU 串口）
  async connectRTU(port, baudRate = 9600, slaveId = 1) {
    try {
      await this.client.connectRTUBuffered(port, {
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });
      
      this.client.setID(slaveId);
      this.client.setTimeout(5000);
      this.isConnected = true;
      
      console.log(`✓ 已连接到 RTU 设备: ${port}, 波特率: ${baudRate}, 从站ID: ${slaveId}`);
      return true;
    } catch (error) {
      console.error('连接 RTU 设备失败:', error.message);
      throw error;
    }
  }

  // 连接到设备（TCP 网络）
  async connectTCP(ip, port = 502, slaveId = 1) {
    try {
      await this.client.connectTCP(ip, { port: port });
      this.client.setID(slaveId);
      this.client.setTimeout(5000);
      this.isConnected = true;
      
      console.log(`✓ 已连接到 TCP 设备: ${ip}:${port}, 从站ID: ${slaveId}`);
      return true;
    } catch (error) {
      console.error('连接 TCP 设备失败:', error.message);
      throw error;
    }
  }

  // 读取保持寄存器
  async readHoldingRegisters(address, count = 1) {
    if (!this.isConnected) {
      throw new Error('设备未连接');
    }

    try {
      const result = await this.client.readHoldingRegisters(address, count);
      return result.data;
    } catch (error) {
      console.error(`读取寄存器失败 [地址: ${address}]:`, error.message);
      throw error;
    }
  }

  // 写入单个保持寄存器
  async writeSingleRegister(address, value) {
    if (!this.isConnected) {
      throw new Error('设备未连接');
    }

    try {
      await this.client.writeRegister(address, value);
      console.log(`✓ 写入寄存器成功 [地址: ${address}, 值: ${value}]`);
      return true;
    } catch (error) {
      console.error(`写入寄存器失败 [地址: ${address}]:`, error.message);
      throw error;
    }
  }

  // 写入多个保持寄存器
  async writeMultipleRegisters(address, values) {
    if (!this.isConnected) {
      throw new Error('设备未连接');
    }

    try {
      await this.client.writeRegisters(address, values);
      console.log(`✓ 写入多个寄存器成功 [起始地址: ${address}, 数量: ${values.length}]`);
      return true;
    } catch (error) {
      console.error(`写入多个寄存器失败 [地址: ${address}]:`, error.message);
      throw error;
    }
  }

  // 设置从站 ID
  async setSlaveId(registerAddress, newSlaveId) {
    console.log(`\n设置从站 ID: ${newSlaveId}`);
    await this.writeSingleRegister(registerAddress, newSlaveId);
    console.log('✓ 从站 ID 设置完成');
  }

  // 设置波特率
  async setBaudRate(registerAddress, baudRate) {
    console.log(`\n设置波特率: ${baudRate}`);
    
    // 波特率映射（根据设备协议调整）
    const baudRateMap = {
      2400: 0,
      4800: 1,
      9600: 2,
      19200: 3,
      38400: 4,
      57600: 5,
      115200: 6
    };
    
    const value = baudRateMap[baudRate];
    if (value === undefined) {
      throw new Error(`不支持的波特率: ${baudRate}`);
    }
    
    await this.writeSingleRegister(registerAddress, value);
    console.log('✓ 波特率设置完成');
  }

  // 设置 IP 地址（TCP 设备）
  async setIPAddress(registerAddress, ipAddress) {
    console.log(`\n设置 IP 地址: ${ipAddress}`);
    
    // 将 IP 地址转换为寄存器值
    const parts = ipAddress.split('.').map(p => parseInt(p));
    if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
      throw new Error('无效的 IP 地址格式');
    }
    
    // IP 地址通常占用 2 个寄存器
    // 寄存器1: 高字节=IP[0], 低字节=IP[1]
    // 寄存器2: 高字节=IP[2], 低字节=IP[3]
    const reg1 = (parts[0] << 8) | parts[1];
    const reg2 = (parts[2] << 8) | parts[3];
    
    await this.writeMultipleRegisters(registerAddress, [reg1, reg2]);
    console.log('✓ IP 地址设置完成');
  }

  // 设置子网掩码
  async setSubnetMask(registerAddress, subnetMask) {
    console.log(`\n设置子网掩码: ${subnetMask}`);
    
    const parts = subnetMask.split('.').map(p => parseInt(p));
    if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
      throw new Error('无效的子网掩码格式');
    }
    
    const reg1 = (parts[0] << 8) | parts[1];
    const reg2 = (parts[2] << 8) | parts[3];
    
    await this.writeMultipleRegisters(registerAddress, [reg1, reg2]);
    console.log('✓ 子网掩码设置完成');
  }

  // 设置网关
  async setGateway(registerAddress, gateway) {
    console.log(`\n设置网关: ${gateway}`);
    
    const parts = gateway.split('.').map(p => parseInt(p));
    if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
      throw new Error('无效的网关地址格式');
    }
    
    const reg1 = (parts[0] << 8) | parts[1];
    const reg2 = (parts[2] << 8) | parts[3];
    
    await this.writeMultipleRegisters(registerAddress, [reg1, reg2]);
    console.log('✓ 网关设置完成');
  }

  // 读取设备信息
  async readDeviceInfo(config) {
    console.log('\n=== 读取设备信息 ===');
    
    const info = {};
    
    try {
      // 读取从站 ID
      if (config.slaveIdAddress !== undefined) {
        const slaveId = await this.readHoldingRegisters(config.slaveIdAddress, 1);
        info.slaveId = slaveId[0];
        console.log(`从站 ID: ${info.slaveId}`);
      }
      
      // 读取波特率
      if (config.baudRateAddress !== undefined) {
        const baudRate = await this.readHoldingRegisters(config.baudRateAddress, 1);
        info.baudRate = this.decodeBaudRate(baudRate[0]);
        console.log(`波特率: ${info.baudRate}`);
      }
      
      // 读取 IP 地址
      if (config.ipAddress !== undefined) {
        const ipRegs = await this.readHoldingRegisters(config.ipAddress, 2);
        info.ipAddress = this.decodeIPAddress(ipRegs);
        console.log(`IP 地址: ${info.ipAddress}`);
      }
      
      // 读取子网掩码
      if (config.subnetMaskAddress !== undefined) {
        const maskRegs = await this.readHoldingRegisters(config.subnetMaskAddress, 2);
        info.subnetMask = this.decodeIPAddress(maskRegs);
        console.log(`子网掩码: ${info.subnetMask}`);
      }
      
      // 读取网关
      if (config.gatewayAddress !== undefined) {
        const gwRegs = await this.readHoldingRegisters(config.gatewayAddress, 2);
        info.gateway = this.decodeIPAddress(gwRegs);
        console.log(`网关: ${info.gateway}`);
      }
      
      return info;
    } catch (error) {
      console.error('读取设备信息失败:', error.message);
      throw error;
    }
  }

  // 解码波特率
  decodeBaudRate(value) {
    const baudRateMap = {
      0: 2400,
      1: 4800,
      2: 9600,
      3: 19200,
      4: 38400,
      5: 57600,
      6: 115200
    };
    return baudRateMap[value] || value;
  }

  // 解码 IP 地址
  decodeIPAddress(registers) {
    const ip1 = (registers[0] >> 8) & 0xFF;
    const ip2 = registers[0] & 0xFF;
    const ip3 = (registers[1] >> 8) & 0xFF;
    const ip4 = registers[1] & 0xFF;
    return `${ip1}.${ip2}.${ip3}.${ip4}`;
  }

  // 保存配置到设备（需要设备支持）
  async saveConfiguration(saveCommandAddress = 9999) {
    console.log('\n保存配置到设备...');
    try {
      await this.writeSingleRegister(saveCommandAddress, 1);
      console.log('✓ 配置已保存到设备');
    } catch (error) {
      console.warn('保存配置失败（设备可能不支持此功能）:', error.message);
    }
  }

  // 重启设备（需要设备支持）
  async rebootDevice(rebootCommandAddress = 9998) {
    console.log('\n重启设备...');
    try {
      await this.writeSingleRegister(rebootCommandAddress, 1);
      console.log('✓ 设备重启命令已发送');
    } catch (error) {
      console.warn('重启设备失败（设备可能不支持此功能）:', error.message);
    }
  }

  // 断开连接
  async disconnect() {
    if (this.isConnected) {
      this.client.close(() => {
        console.log('\n✓ 已断开连接');
      });
      this.isConnected = false;
    }
  }

  // 完整的设备初始化流程
  async initializeDevice(connectionConfig, deviceConfig) {
    console.log('\n========================================');
    console.log('Modbus 设备初始化工具');
    console.log('========================================\n');

    try {
      // 1. 连接设备
      console.log('步骤 1: 连接设备');
      if (connectionConfig.type === 'rtu') {
        await this.connectRTU(
          connectionConfig.port,
          connectionConfig.baudRate,
          connectionConfig.slaveId
        );
      } else if (connectionConfig.type === 'tcp') {
        await this.connectTCP(
          connectionConfig.ip,
          connectionConfig.port,
          connectionConfig.slaveId
        );
      }

      // 2. 读取当前配置
      console.log('\n步骤 2: 读取当前配置');
      const currentInfo = await this.readDeviceInfo(deviceConfig.registerMap);

      // 3. 写入新配置
      console.log('\n步骤 3: 写入新配置');
      
      if (deviceConfig.newSlaveId !== undefined) {
        await this.setSlaveId(deviceConfig.registerMap.slaveIdAddress, deviceConfig.newSlaveId);
      }
      
      if (deviceConfig.newBaudRate !== undefined) {
        await this.setBaudRate(deviceConfig.registerMap.baudRateAddress, deviceConfig.newBaudRate);
      }
      
      if (deviceConfig.newIPAddress !== undefined) {
        await this.setIPAddress(deviceConfig.registerMap.ipAddress, deviceConfig.newIPAddress);
      }
      
      if (deviceConfig.newSubnetMask !== undefined) {
        await this.setSubnetMask(deviceConfig.registerMap.subnetMaskAddress, deviceConfig.newSubnetMask);
      }
      
      if (deviceConfig.newGateway !== undefined) {
        await this.setGateway(deviceConfig.registerMap.gatewayAddress, deviceConfig.newGateway);
      }

      // 4. 保存配置
      if (deviceConfig.saveConfig) {
        console.log('\n步骤 4: 保存配置');
        await this.saveConfiguration(deviceConfig.registerMap.saveCommandAddress);
      }

      // 5. 重启设备（可选）
      if (deviceConfig.rebootDevice) {
        console.log('\n步骤 5: 重启设备');
        await this.rebootDevice(deviceConfig.registerMap.rebootCommandAddress);
      }

      console.log('\n========================================');
      console.log('✓ 设备初始化完成！');
      console.log('========================================\n');

      return true;
    } catch (error) {
      console.error('\n✗ 设备初始化失败:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

module.exports = ModbusDeviceInitializer;
