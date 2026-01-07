# Modbus RS485 温湿度传感器查询程序（C语言版）

基于 C 语言和 libmodbus 库实现的 Modbus RTU 温湿度传感器读取程序。

## 功能特点

- 支持多个温湿度传感器
- Modbus RTU 协议通信
- RS485 串口连接
- 实时数据读取与显示
- 支持 Ctrl+C 优雅退出

## 环境要求

- Windows 操作系统
- CMake 3.10 或更高版本
- libmodbus 库

## 安装依赖

### Windows (使用 vcpkg)

```powershell
vcpkg install libmodbus
```

### Windows (手动安装)

1. 下载 libmodbus 源码：https://github.com/stephane/libmodbus
2. 使用 MinGW 或 Visual Studio 编译
3. 将头文件和库文件放到系统路径

## 编译程序

```bash
cd d:\Git\modbus\C
cmake -B build
cmake --build build
```

## 运行程序

```bash
build\modbus_sensor_reader.exe
```

## 配置说明

在 `src/main.c` 文件中修改配置参数：

### 串口配置

```c
#define PORT "COM3"       // 串口号（Windows: COM1/COM2, Linux: /dev/ttyUSB0）
#define BAUDRATE 9600     // 波特率（常用值：9600、19200、115200）
#define DATA_BITS 8       // 数据位（常用值：7、8）
#define STOP_BITS 1       // 停止位（常用值：1、2）
#define PARITY 'N'        // 校验位（N-无，E-偶校验，O-奇校验）
#define READ_INTERVAL 2   // 读取间隔（秒）
#define TIMEOUT 1.0f      // 超时时间（秒）
```

### 传感器配置

```c
static const SensorConfig Sensors[] = {
    {"传感器1", 1, 0x0000, 0x0001, 0.1f, 0.1f},
    {"传感器2", 2, 0x0000, 0x0001, 0.1f, 0.1f},
    {"传感器3", 3, 0x0000, 0x0001, 0.1f, 0.1f},
};
```

字段说明：
- `name`：传感器名称
- `slave_id`：从站地址（1-247）
- `temp_register`：温度寄存器地址（十六进制）
- `humi_register`：湿度寄存器地址（十六进制）
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
- 调整TIMEOUT值

### 3. 数据异常

- 校验寄存器地址是否正确
- 检查缩放系数设置
- 确认数据格式（整数/浮点）

## 项目结构

```
C/
├── CMakeLists.txt      # CMake构建配置
├── README.md           # 本说明文件
└── src/
    ├── main.c          # 主程序入口
    ├── sensor_reader.c # 传感器读取实现
    └── sensor_reader.h # 传感器读取头文件
```

## 依赖说明

- [libmodbus](https://github.com/stephane/libmodbus) - Modbus协议库

## 许可证

LGPL v2.1
