#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
温湿度传感器读取模块
封装Modbus通讯和传感器数据读取逻辑
支持多个串口连接
"""

from typing import Tuple, Optional, Dict, Any, List
from pymodbus.client import ModbusSerialClient
from pymodbus.exceptions import ModbusException


class ModbusSensorReader:
    """Modbus温湿度传感器读取器"""
    
    def __init__(
        self,
        port: str,
        baudrate: int = 9600,
        parity: str = 'N',
        stopbits: int = 1,
        bytesize: int = 8,
        timeout: float = 1.0
    ):
        """
        初始化传感器读取器
        
        :param port: 串口号
        :param baudrate: 波特率
        :param parity: 校验位（N/E/O）
        :param stopbits: 停止位
        :param bytesize: 数据位
        :param timeout: 超时时间（秒）
        """
        self.port = port
        self.baudrate = baudrate
        self.parity = parity
        self.stopbits = stopbits
        self.bytesize = bytesize
        self.timeout = timeout
        
        self.client: Optional[ModbusSerialClient] = None
    
    def connect(self) -> bool:
        """建立与Modbus设备的连接"""
        self.client = ModbusSerialClient(
            port=self.port,
            baudrate=self.baudrate,
            parity=self.parity,
            stopbits=self.stopbits,
            bytesize=self.bytesize,
            timeout=self.timeout
        )
        return self.client.connect()
    
    def disconnect(self):
        """关闭连接"""
        if self.client:
            self.client.close()
            self.client = None
    
    def read_sensor_data(
        self,
        slave_id: int,
        temp_register: int,
        humidity_register: int,
        temp_scale: float = 0.1,
        humidity_scale: float = 0.1
    ) -> Optional[Tuple[float, float]]:
        """
        读取单个传感器的温湿度数据
        
        :param slave_id: 从站地址
        :param temp_register: 温度寄存器地址
        :param humidity_register: 湿度寄存器地址
        :param temp_scale: 温度缩放因子
        :param humidity_scale: 湿度缩放因子
        :return: (温度, 湿度) 元组，失败返回None
        """
        if not self.client:
            print("错误：未建立连接")
            return None
        
        try:
            temp_result = self.client.read_holding_registers(
                temp_register, 1, slave_id=slave_id
            )
            if temp_result.isError():
                print(f"传感器 {slave_id} 读取温度失败: {temp_result}")
                return None
            
            humi_result = self.client.read_holding_registers(
                humidity_register, 1, slave_id=slave_id
            )
            if humi_result.isError():
                print(f"传感器 {slave_id} 读取湿度失败: {humi_result}")
                return None
            
            temp_raw = temp_result.registers[0]
            if temp_raw > 32767:
                temperature = (temp_raw - 65536) / temp_scale
            else:
                temperature = temp_raw / temp_scale
            
            humidity_raw = humi_result.registers[0]
            humidity = humidity_raw / humidity_scale
            
            return temperature, humidity
            
        except ModbusException as e:
            print(f"Modbus异常 (传感器 {slave_id}): {e}")
            return None
        except Exception as e:
            print(f"读取传感器 {slave_id} 数据失败: {e}")
            return None


class MultiPortReader:
    """多串口Modbus传感器读取器"""
    
    def __init__(self, ports_config: List[Dict[str, Any]]):
        """
        初始化多串口读取器
        
        :param ports_config: 串口配置列表，每个配置包含port, baudrate等参数
        """
        self.readers: Dict[str, ModbusSensorReader] = {}
        self.port_configs: Dict[str, Dict[str, Any]] = {}
        
        for config in ports_config:
            port_name = config.get("name", config["port"])
            port = config["port"]
            self.port_configs[port_name] = config
            self.readers[port_name] = ModbusSensorReader(
                port=port,
                baudrate=config.get("baudrate", 9600),
                parity=config.get("parity", "N"),
                stopbits=config.get("stopbits", 1),
                bytesize=config.get("bytesize", 8),
                timeout=config.get("timeout", 1.0)
            )
    
    def connect_all(self) -> bool:
        """连接所有串口"""
        success_count = 0
        for name, reader in self.readers.items():
            if reader.connect():
                print(f"已连接到串口: {name} ({reader.port})")
                success_count += 1
            else:
                print(f"连接串口失败: {name} ({reader.port})")
        return success_count > 0
    
    def disconnect_all(self):
        """关闭所有连接"""
        for reader in self.readers.values():
            reader.disconnect()
        print("已关闭所有串口连接")
    
    def get_reader(self, port_name: str) -> Optional[ModbusSensorReader]:
        """获取指定串口的读取器"""
        return self.readers.get(port_name)
    
    def read_sensor_data(
        self,
        port_name: str,
        slave_id: int,
        temp_register: int,
        humidity_register: int,
        temp_scale: float = 0.1,
        humidity_scale: float = 0.1
    ) -> Optional[Tuple[float, float]]:
        """
        读取指定串口传感器的数据
        
        :param port_name: 串口名称
        :param slave_id: 从站地址
        :param temp_register: 温度寄存器地址
        :param humidity_register: 湿度寄存器地址
        :param temp_scale: 温度缩放因子
        :param humidity_scale: 湿度缩放因子
        :return: (温度, 湿度) 元组，失败返回None
        """
        reader = self.readers.get(port_name)
        if not reader:
            print(f"错误：未找到串口 {port_name}")
            return None
        return reader.read_sensor_data(
            slave_id, temp_register, humidity_register, temp_scale, humidity_scale
        )


def read_all_sensors(
    reader: MultiPortReader,
    sensors: list
) -> Dict[str, Optional[Tuple[float, float]]]:
    """
    批量读取所有传感器数据
    
    :param reader: MultiPortReader实例
    :param sensors: 传感器配置列表，每个传感器需包含port字段
    :return: 传感器名称到数据的映射
    """
    results = {}
    for sensor in sensors:
        name = sensor["name"]
        port_name = sensor.get("port", "default")
        slave_id = sensor["slave_id"]
        temp_reg = sensor.get("temp_reg", 0)
        humi_reg = sensor.get("humi_reg", 1)
        temp_scale = sensor.get("temp_scale", 0.1)
        humi_scale = sensor.get("humi_scale", 0.1)
        
        data = reader.read_sensor_data(
            port_name, slave_id, temp_reg, humi_reg, temp_scale, humi_scale
        )
        results[name] = data
    
    return results
