# Modbus RS485 温湿度传感器数据采集程序 (Bash版本)

## 功能特性

- 使用Bash脚本实现Modbus RTU协议的RS485温湿度传感器数据采集
- 支持多个串口和多个传感器
- 实时数据读取和显示
- 支持多种数据存储方式（CSV、SQLite、InfluxDB）
- 本地缓存机制，防止数据丢失
- 跨平台支持（Linux/Windows WSL）
- 模块化设计，便于扩展

## 项目结构

```
modbus/Shell/
├── README.md              # 本说明文件
├── config.json            # 配置文件
├── src/                   # 源代码目录
│   └── modbus-sensor.sh   # 主程序脚本
├── modbus-sensor.log      # 日志文件（自动生成）
└── cache.db               # 缓存数据库（自动生成）
```

## 快速开始

### 1. 安装依赖

在Linux系统上：

```bash
# 安装jq（用于解析JSON配置）
sudo apt-get install jq  # Debian/Ubuntu
sudo yum install jq      # CentOS/RHEL

# 安装SQLite3（用于缓存和数据存储）
sudo apt-get install sqlite3

# 安装串口工具（可选）
sudo apt-get install minicom screen picocom

# 安装Modbus工具（可选，如果有支持的Modbus RTU工具）
sudo apt-get install libmodbus-dev
```

在Windows系统上：

```bash
# 需要安装WSL (Windows Subsystem for Linux)
# 然后在WSL中安装上述依赖
```

### 2. 配置传感器

编辑 `config.json` 文件，配置串口和传感器信息：

```json
{
  "readInterval": 10,  // 读取间隔（秒）
  "ports": [           // 串口配置
    {
      "name": "/dev/ttyUSB0",
      "baudRate": 9600,
      "dataBits": 8,
      "parity": "N",
      "stopBits": 1
    }
  ],
  "sensors": [         // 传感器配置
    {
      "name": "Sensor1",
      "port": "/dev/ttyUSB0",
      "slaveId": 1,
      "tempRegister": 0,
      "humidityRegister": 1
    }
  ],
  "storage_configs": [ // 存储配置
    {
      "type": "CSV",
      "file_path": "./sensor_data.csv"
    },
    {
      "type": "SQLite",
      "db_path": "./sensor_data.db"
    },
    {
      "type": "InfluxDB",
      "url": "http://localhost:8086",
      "database": "modbus"
    }
  ]
}
```

### 3. 运行程序

```bash
# 进入src目录
cd src

# 赋予执行权限
chmod +x modbus-sensor.sh

# 运行程序
./modbus-sensor.sh
```

## 使用说明

### 添加新传感器

在 `config.json` 的 `sensors` 数组中添加新的传感器配置：

```json
{
  "name": "NewSensor",
  "port": "/dev/ttyUSB0",
  "slaveId": 3,
  "tempRegister": 0,
  "humidityRegister": 1
}
```

### 添加新串口

在 `config.json` 的 `ports` 数组中添加新的串口配置：

```json
{
  "name": "/dev/ttyUSB1",
  "baudRate": 9600,
  "dataBits": 8,
  "parity": "N",
  "stopBits": 1
}
```

### 配置数据存储

在 `config.json` 的 `storage_configs` 数组中配置存储方式：

#### CSV存储
```json
{
  "type": "CSV",
  "file_path": "./sensor_data.csv"
}
```

#### SQLite存储
```json
{
  "type": "SQLite",
  "db_path": "./sensor_data.db"
}
```

#### InfluxDB存储
```json
{
  "type": "InfluxDB",
  "url": "http://localhost:8086",
  "database": "modbus"
}
```

## 输出示例

```
[2026-01-07 10:00:00] [INFO] 启动Modbus温湿度传感器数据采集程序
[2026-01-07 10:00:00] [INFO] 检查依赖...
[2026-01-07 10:00:00] [INFO] 依赖检查完成
[2026-01-07 10:00:00] [INFO] 加载配置文件: ../config.json
[2026-01-07 10:00:00] [INFO] 配置加载完成
[2026-01-07 10:00:00] [INFO] 初始化缓存数据库...
[2026-01-07 10:00:00] [INFO] 缓存数据库初始化完成
[2026-01-07 10:00:00] [INFO] 开始一轮数据采集
[2026-01-07 10:00:00] [INFO] 读取传感器数据: Sensor1 (从机ID: 1, 端口: /dev/ttyUSB0)
[2026-01-07 10:00:00] [WARNING] 使用模拟数据，因为Modbus通信未实现或失败
[2026-01-07 10:00:00] [INFO] 传感器 Sensor1 数据: 温度=25.6°C, 湿度=68.2%
[2026-01-07 10:00:00] [INFO] 数据保存到CSV成功: ./sensor_data.csv
[2026-01-07 10:00:00] [INFO] 数据保存到SQLite成功: ./sensor_data.db
[2026-01-07 10:00:00] [ERROR] 数据保存到InfluxDB失败: http://localhost:8086/modbus
[2026-01-07 10:00:00] [INFO] 等待 10 秒后进行下一轮采集
```

## 日志查看

程序会生成日志文件 `modbus-sensor.log`，可以使用以下命令查看：

```bash
tail -f modbus-sensor.log
```

## 故障排除

1. **无法解析配置文件**
   - 检查 `config.json` 文件格式是否正确
   - 确保已安装 `jq` 工具

2. **串口访问权限问题**
   - 将用户添加到 `dialout` 组：`sudo usermod -a -G dialout $USER`
   - 重新登录或使用 `newgrp dialout` 生效

3. **Modbus通信失败**
   - 检查串口连接是否正确
   - 确认传感器的从机地址和寄存器地址配置正确
   - 验证波特率、数据位、校验位、停止位等通信参数

4. **SQLite操作失败**
   - 检查SQLite3是否已安装
   - 确保程序有文件写入权限

## 高级功能

### 自定义Modbus通信

程序支持两种Modbus通信方式：

1. **使用外部Modbus工具**：如果系统中安装了支持的Modbus RTU工具（如 `modbus-rtu-read`），程序会自动使用

2. **模拟数据**：如果没有外部Modbus工具，程序会生成模拟数据

可以根据需要修改 `src/modbus-sensor.sh` 中的 `read_sensor` 函数，实现自定义的Modbus通信逻辑。

### 数据缓存机制

程序使用SQLite3实现本地缓存，当数据库连接失败时，数据会暂时保存在缓存中，待连接恢复后再同步。

### 后台运行

可以使用 `nohup` 命令在后台运行程序：

```bash
nohup ./src/modbus-sensor.sh > /dev/null 2>&1 &
```

## 依赖

- Bash 4.0+
- jq (用于JSON解析)
- SQLite3 (用于缓存和数据存储)
- 可选：modbus-rtu-read 或其他Modbus RTU工具
- 可选：minicom/screen/picocom (用于串口调试)

## 许可证

MIT License