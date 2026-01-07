# Modbus温湿度传感器读取程序 (C++)

## 简介

本程序使用C++语言实现，通过RS485接口读取Modbus温湿度传感器的数据，支持Windows和Linux平台。

## 功能特性

- 支持多个Modbus传感器配置
- 跨平台支持（Windows/Linux自动检测）
- 多种数据存储方式（SQLite、CSV、InfluxDB）
- 配置文件支持（JSON格式）
- 实时数据读取和显示

## 环境要求

### Windows
- Visual Studio 2019或更高版本
- CMake 3.15或更高版本
- SQLite3库
- Boost库

### Linux
- GCC 7.0或更高版本
- CMake 3.15或更高版本
- SQLite3开发库
- Boost开发库

## 依赖安装

### Windows (使用vcpkg)
```cmd
vcpkg install sqlite3 boost-system boost-filesystem
vcpkg integrate install
```

### Ubuntu/Debian
```bash
sudo apt-get install cmake build-essential libsqlite3-dev libboost-all-dev
```

### CentOS/RHEL
```bash
sudo yum install cmake gcc-c++ sqlite-devel boost-devel
```

## 编译

### Windows
```cmd
mkdir build
cd build
cmake .. -DCMAKE_TOOLCHAIN_FILE=C:/path/to/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build . --config Release
```

### Linux
```bash
mkdir build
cd build
cmake ..
make -j4
```

## 配置

编辑 `config.json` 文件：

```json
{
    "port": "/dev/ttyUSB0",
    "baudrate": 9600,
    "data_bits": 8,
    "stop_bits": 1,
    "parity": "N",
    "timeout": 1.0,
    "read_interval": 2,
    "storage_type": "sqlite",
    "storage_sqlite_path": "sensor_data.db",
    "storage_influxdb_url": "http://localhost:8086",
    "storage_influxdb_token": "your-token",
    "storage_influxdb_org": "your-org",
    "storage_influxdb_bucket": "sensor-data",
    "storage_csv_path": "sensor_data.csv",
    "sensors": [
        {
            "name": "传感器1",
            "slave_id": 1,
            "temp_reg": 0,
            "humi_reg": 1,
            "temp_scale": 0.1,
            "humi_scale": 0.1
        }
    ]
}
```

### 配置说明

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `port` | 串口名称 | Windows: COM1, Linux: /dev/ttyUSB0 |
| `baudrate` | 波特率 | 9600 |
| `data_bits` | 数据位 | 8 |
| `stop_bits` | 停止位 | 1 |
| `parity` | 校验位 (N/O/E) | N |
| `timeout` | 超时时间(秒) | 1.0 |
| `read_interval` | 读取间隔(秒) | 2 |
| `storage_type` | 存储类型 | sqlite/csv/influxdb/none |

## 运行

### Windows
```cmd
./Release/modbus_sensor_reader_cpp.exe
```

### Linux
```bash
./modbus_sensor_reader_cpp
```

## 项目结构

```
C++/
├── CMakeLists.txt          # CMake构建配置
├── config.json             # 配置文件
├── README.md               # 本文档
├── include/
│   ├── sensor_reader.h     # 传感器读取接口
│   ├── data_storage.h      # 数据存储接口
│   └── config.h            # 配置接口
└── src/
    ├── main.cpp            # 主程序
    ├── sensor_reader.cpp   # 传感器读取实现
    ├── data_storage.cpp    # 数据存储实现
    └── config.cpp          # 配置实现
```

## 存储类型

### SQLite
- 默认存储方式
- 数据保存在本地SQLite数据库文件
- 支持SQL查询和分析

### CSV
- 轻量级存储
- 易于导入Excel或其他工具
- 适合小规模数据

### InfluxDB
- 时序数据库
- 适合大规模数据采集
- 提供丰富的时序分析功能

### None
- 不保存数据
- 仅显示实时数据

## 传感器配置

每个传感器需要配置以下参数：

| 参数 | 描述 |
|------|------|
| `name` | 传感器名称 |
| `slave_id` | Modbus从站地址 |
| `temp_reg` | 温度寄存器地址 |
| `humi_reg` | 湿度寄存器地址 |
| `temp_scale` | 温度缩放系数 |
| `humi_scale` | 湿度缩放系数 |

## 常见问题

### 串口无法打开
- 检查串口名称是否正确
- 确认串口未被其他程序占用
- 检查用户权限（Linux下可能需要sudo）

### 数据读取失败
- 检查传感器地址是否正确
- 确认Modbus通信参数（波特率、校验位等）
- 检查RS485转换器连接

### 编译错误
- 确保所有依赖已正确安装
- 检查CMake配置
- 查看编译器错误信息

## 许可证

MIT License
