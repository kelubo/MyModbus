# Modbus RS485 多传感器温湿度监控系统

## 功能特性

- 支持多个Modbus RTU协议的RS485温湿度传感器
- 可配置任意数量的传感器
- 实时数据读取和显示
- 规范化的Python项目结构
- 面向对象设计，便于扩展

## 项目结构

```
modbus/
├── README.md              # 本说明文件
├── requirements.txt       # Python依赖
├── pyproject.toml         # 项目配置
├── setup.py              # 安装脚本
├── .gitignore            # Git忽略文件
├── docs/                 # 文档目录
│   └── API.md            # API文档
└── src/                  # 源代码目录
    ├── main.py           # 主程序入口
    └── sensor_reader.py  # 传感器读取模块
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

或者使用poetry：

```bash
poetry install
```

### 2. 配置传感器

编辑 `src/main.py` 中的配置区域：

```python
# 串口配置（自动检测平台）
# Windows: COM3, Linux: /dev/ttyUSB0
PORT = 'COM3' if platform.system() == 'Windows' else '/dev/ttyUSB0'
BAUDRATE = 9600
PARITY = 'N'
STOPBITS = 1
BYTESIZE = 8
READ_INTERVAL = 2  # 读取间隔（秒）

# 传感器配置
SENSORS = [
    {"name": "传感器1", "slave_id": 1, "temp_reg": 0x0000, "humi_reg": 0x0001},
    {"name": "传感器2", "slave_id": 2, "temp_reg": 0x0000, "humi_reg": 0x0001},
    {"name": "传感器3", "slave_id": 3, "temp_reg": 0x0000, "humi_reg": 0x0001},
]
```

**注意：** 程序会自动检测操作系统，Windows默认使用`COM3`，Linux默认使用`/dev/ttyUSB0`。如需手动指定，请直接修改`PORT`的值。

### 3. 运行程序

```bash
# 方式一：直接运行
python src/main.py

# 方式二：安装后运行
pip install -e .
modbus_temp_humidity
```

## 使用说明

### 添加新传感器

在 `SENSORS` 列表中添加新的传感器配置：

```python
SENSORS = [
    {"name": "传感器1", "slave_id": 1, "temp_reg": 0x0000, "humi_reg": 0x0001},
    {"name": "传感器2", "slave_id": 2, "temp_reg": 0x0000, "humi_reg": 0x0001},
    # 添加新传感器
    {"name": "仓库传感器", "slave_id": 4, "temp_reg": 0x0002, "humi_reg": 0x0003},
]
```

### 传感器配置说明

每个传感器配置项包含：

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `name` | 传感器名称 | "传感器1" |
| `slave_id` | 从站地址 (1-247) | 1 |
| `temp_reg` | 温度寄存器地址 | 0x0000 |
| `humi_reg` | 湿度寄存器地址 | 0x0001 |

### 使用模块

```python
from src.sensor_reader import ModbusSensorReader

# 创建读取器
reader = ModbusSensorReader(
    port='COM3',
    baudrate=9600,
    parity='N',
    stopbits=1,
    bytesize=8,
    timeout=1.0
)

# 连接设备
if reader.connect():
    # 读取数据
    result = reader.read_sensor_data(
        slave_id=1,
        temp_register=0x0000,
        humidity_register=0x0001
    )
    if result:
        temp, humi = result
        print(f"温度: {temp}°C, 湿度: {humi}%RH")
    
    # 断开连接
    reader.disconnect()
```

## 输出示例

```
正在初始化Modbus连接...
成功连接到设备 COM3
已配置 3 个传感器
开始读取温湿度数据...
按 Ctrl+C 退出程序

[2023-11-01 15:30:00]
============================================================
传感器1:
  温度:  25.6 °C
  湿度:  68.2 %RH
传感器2:
  温度:  26.1 °C
  湿度:  65.8 %RH
传感器3:
  温度:  24.9 °C
  湿度:  70.3 %RH
============================================================
```

## 故障排除

1. **无法连接到设备**
   - 检查串口号是否正确
   - 检查设备是否已连接到电脑
   - 检查USB转RS485驱动是否安装

2. **读取数据失败**
   - 确认从站地址配置正确
   - 检查寄存器地址是否与传感器手册一致
   - 验证波特率、校验位等通讯参数

3. **数据显示异常**
   - 调整缩放因子（默认0.1）
   - 检查是否需要处理补码（负数温度）

## 开发

### 运行测试

```bash
pytest
```

### 代码检查

```bash
# pylint
pylint src/

# mypy
mypy src/
```

## 依赖

- Python 3.8+
- pymodbus >= 3.0.0

## 许可证

MIT License
