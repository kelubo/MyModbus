# Modbus RS485 温湿度传感器查询程序（Go语言版）

基于 Go 语言和 goburrow/modbus 库实现的 Modbus RTU 温湿度传感器读取程序。

## 功能特点

- 支持多个温湿度传感器
- 支持多个串口配置
- Modbus RTU 协议通信
- RS485 串口连接
- 实时数据读取与显示
- 多种数据存储方式（SQLite、CSV、InfluxDB）
- 配置文件支持（JSON格式）

## 环境要求

- Go 1.20 或更高版本
- RS485 串口设备

## 安装依赖

```bash
cd d:\Git\modbus\Go\src\modbus
go mod tidy
```

## 运行程序

```bash
go run main.go
```

## 配置说明

程序使用 `config.json` 文件进行配置，支持多串口和多传感器配置。

### 配置文件格式

```json
{
    "ports": [
        {
            "name": "串口1",
            "port": "/dev/ttyUSB0",
            "baudrate": 9600,
            "data_bits": 8,
            "stop_bits": 1,
            "parity": "N",
            "timeout": 1.0
        },
        {
            "name": "串口2",
            "port": "/dev/ttyUSB1",
            "baudrate": 9600,
            "data_bits": 8,
            "stop_bits": 1,
            "parity": "N",
            "timeout": 1.0
        }
    ],
    "read_interval": 2,
    "storage_type": "sqlite",
    "storage_configs": {
        "sqlite": {
            "db_path": "sensor_data.db"
        },
        "influxdb": {
            "url": "http://localhost:8086",
            "token": "your-token-here",
            "org": "your-org",
            "bucket": "sensor-data"
        },
        "csv": {
            "file_path": "sensor_data.csv"
        }
    },
    "sensors": [
        {
            "name": "传感器1",
            "port": "串口1",
            "slave_id": 1,
            "temp_reg": 0,
            "humi_reg": 1,
            "temp_scale": 0.1,
            "humi_scale": 0.1
        }
    ]
}
```

### 配置参数说明

#### 串口配置
- `name`：串口名称（用于标识）
- `port`：串口设备路径
- `baudrate`：波特率（常用值：9600、19200、115200）
- `data_bits`：数据位（常用值：7、8）
- `stop_bits`：停止位（常用值：1、2）
- `parity`：校验位（N-无，E-偶校验，O-奇校验）
- `timeout`：超时时间（秒）

#### 存储配置
- `storage_type`：存储类型（sqlite/csv/influxdb）
- `storage_configs`：各存储类型的具体配置

#### 传感器配置
- `name`：传感器名称
- `port`：传感器连接的串口名称
- `slave_id`：从站地址（1-247）
- `temp_reg`：温度寄存器地址
- `humi_reg`：湿度寄存器地址
- `temp_scale`：温度缩放系数（默认0.1）
- `humi_scale`：湿度缩放系数（默认0.1）

## 输出示例

```
正在初始化Modbus连接...
成功连接到设备 COM3
已配置 3 个传感器
开始读取温湿度数据...
按 Ctrl+C 退出程序

[2024-01-15 14:30:25]
  传感器1: 温度=23.5°C, 湿度=55.2%
  传感器2: 温度=24.1°C, 湿度=52.8%
  传感器3: 温度=22.9°C, 湿度=58.3%
```

## 常见问题

### 1. 连接失败

- 检查串口号是否正确
- 确认串口未被其他程序占用
- 验证波特率和参数设置

### 2. 读取超时

- 检查传感器是否正确连接
- 确认从站地址设置正确
- 调整Timeout值

### 3. 数据异常

- 校验寄存器地址是否正确
- 检查缩放系数设置
- 确认数据格式（整数/浮点）

## 项目结构

```
Go/
├── src/
│   └── modbus/
│       ├── config.go          # 配置文件处理
│       ├── data_storage.go    # 数据存储实现
│       ├── go.mod             # Go模块文件
│       ├── go.sum             # 依赖校验文件
│       ├── main.go            # 主程序入口
│       └── sensor_reader.go   # 传感器读取实现
├── bin/
│   └── modbus-temp-humidity.exe  # 可执行文件
├── config.json         # 配置文件
├── Dockerfile          # Docker镜像配置
├── README.md           # 本说明文件
└── modbus-sensor-reader.service  # 系统服务配置
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

## 依赖说明

- [goburrow/modbus](https://github.com/goburrow/modbus) - Modbus协议库

## 许可证

MIT License
