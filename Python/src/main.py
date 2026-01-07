#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Modbus RS485 温湿度传感器查询程序
使用 pymodbus 库通过 RS485 通讯读取多个温湿度传感器数据
支持多种数据存储方式: SQLite, InfluxDB, CSV
支持多个串口连接
"""

import sys
import time
import json
import platform
from pathlib import Path
from typing import Dict, Any, List

from sensor_reader import ModbusSensorReader, MultiPortReader, read_all_sensors
from data_storage import StorageFactory

CONFIG_FILE = Path(__file__).parent.parent / "config.json"


def load_config() -> Dict[str, Any]:
    """加载配置文件"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def get_default_config() -> Dict[str, Any]:
    """返回默认配置"""
    system = platform.system()
    ports = []
    
    if system == 'Windows':
        ports = [
            {"name": "串口1", "port": "COM3", "baudrate": 9600, "parity": "N", "stopbits": 1, "bytesize": 8, "timeout": 1.0},
            {"name": "串口2", "port": "COM4", "baudrate": 9600, "parity": "N", "stopbits": 1, "bytesize": 8, "timeout": 1.0},
        ]
    else:
        ports = [
            {"name": "串口1", "port": "/dev/ttyUSB0", "baudrate": 9600, "parity": "N", "stopbits": 1, "bytesize": 8, "timeout": 1.0},
            {"name": "串口2", "port": "/dev/ttyUSB1", "baudrate": 9600, "parity": "N", "stopbits": 1, "bytesize": 8, "timeout": 1.0},
        ]
    
    return {
        "ports": ports,
        "read_interval": 2,
        "storage_type": "sqlite",
        "storage_configs": {
            "sqlite": {"db_path": "sensor_data.db"},
            "influxdb": {"url": "http://localhost:8086", "token": "your-token", "org": "your-org", "bucket": "sensor-data"},
            "csv": {"file_path": "sensor_data.csv"}
        },
        "sensors": [
            {"name": "传感器1", "port": "串口1", "slave_id": 1, "temp_reg": 0, "humi_reg": 1, "temp_scale": 0.1, "humi_scale": 0.1},
            {"name": "传感器2", "port": "串口1", "slave_id": 2, "temp_reg": 0, "humi_reg": 1, "temp_scale": 0.1, "humi_scale": 0.1},
            {"name": "传感器3", "port": "串口2", "slave_id": 1, "temp_reg": 0, "humi_reg": 1, "temp_scale": 0.1, "humi_scale": 0.1},
            {"name": "传感器4", "port": "串口2", "slave_id": 2, "temp_reg": 0, "humi_reg": 1, "temp_scale": 0.1, "humi_scale": 0.1},
        ]
    }


def print_sensor_data(results: Dict[str, Any]):
    """格式化打印传感器数据"""
    print("=" * 60)
    for name, data in results.items():
        if data:
            temperature, humidity = data
            print(f"{name}:")
            print(f"  温度: {temperature:6.1f} °C")
            print(f"  湿度: {humidity:6.1f} %RH")
        else:
            print(f"{name}: 数据读取失败")
    print("=" * 60)


def save_sensor_data(storage, results: Dict[str, Any], sensors: List[Dict[str, Any]]):
    """保存传感器数据到存储"""
    if not storage:
        return
    sensor_map = {s['name']: s for s in sensors}
    data_to_save = []
    for name, data in results.items():
        if data and name in sensor_map:
            temperature, humidity = data
            sensor = sensor_map[name]
            data_to_save.append({
                'sensor_name': name,
                'slave_id': sensor['slave_id'],
                'temperature': temperature,
                'humidity': humidity
            })
    if data_to_save:
        storage.save_batch(data_to_save)


def main():
    """主函数"""
    print("正在加载配置...")
    config = load_config()
    if not config:
        print("未找到配置文件，使用默认配置")
        config = get_default_config()
    
    ports_config = config.get("ports", [])
    sensors = config.get("sensors", [])
    read_interval = config.get("read_interval", 2)
    storage_type = config.get("storage_type", "sqlite")
    storage_configs = config.get("storage_configs", {})
    
    print(f"已配置 {len(ports_config)} 个串口")
    print(f"已配置 {len(sensors)} 个传感器")
    
    storage_config = storage_configs.get(storage_type, {})
    storage = StorageFactory.create_storage(storage_type, **storage_config)
    if storage:
        print(f"数据存储已启用: {storage_type.upper()}")
    else:
        print("数据存储已禁用")
    
    multi_reader = MultiPortReader(ports_config)
    
    try:
        if not multi_reader.connect_all():
            print("错误：无法连接到任何串口")
            return 1
        
        print("开始读取温湿度数据...")
        print("按 Ctrl+C 退出程序")
        print()
        
        while True:
            current_time = time.strftime('%Y-%m-%d %H:%M:%S')
            print(f"[{current_time}]")
            
            results = read_all_sensors(multi_reader, sensors)
            print_sensor_data(results)
            save_sensor_data(storage, results, sensors)
            
            time.sleep(read_interval)
    
    except KeyboardInterrupt:
        print("\n用户中断，程序退出")
        return 0
    except Exception as e:
        print(f"程序异常: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        multi_reader.disconnect_all()
        if storage:
            storage.close()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
