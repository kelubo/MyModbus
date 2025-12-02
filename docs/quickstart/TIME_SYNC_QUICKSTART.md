# 时间同步快速开始

## 5分钟快速配置时间同步

### 方式一：使用本地时钟（最简单）

**适用场景**：单机部署，对时间精度要求不高

```bash
# 无需配置，默认使用本地时钟
npm start
```

✅ 完成！系统将使用服务器本地时间。

---

### 方式二：使用 NTP 服务器（推荐）

**适用场景**：有网络连接，需要准确时间

#### 步骤 1：配置环境变量

编辑 `.env` 文件：

```bash
TIME_SOURCE=ntp
NTP_SERVER=pool.ntp.org
TIME_SYNC_INTERVAL=3600000
```

#### 步骤 2：启动服务

```bash
npm start
```

#### 步骤 3：验证

1. 访问 http://localhost:3000
2. 点击 ⚙️ 设置 → 时间设置
3. 查看"时间同步状态"
4. 点击"立即同步"测试

✅ 完成！系统将每小时从 NTP 服务器同步时间。

---

### 方式三：使用 GPS 时间（高精度）

**适用场景**：需要高精度时间，无网络环境

#### 步骤 1：连接 GPS 模块

```
GPS 模块 → USB 线 → 服务器
```

#### 步骤 2：识别串口

**Linux**：
```bash
ls /dev/ttyUSB*
# 输出: /dev/ttyUSB0
```

**Windows**：
```
设备管理器 → 端口 → 查看 COM 端口
# 例如: COM3
```

#### 步骤 3：设置串口权限（Linux）

```bash
sudo usermod -a -G dialout $USER
# 或
sudo chmod 666 /dev/ttyUSB0
```

#### 步骤 4：配置环境变量

编辑 `.env` 文件：

```bash
TIME_SOURCE=gps
GPS_PORT=/dev/ttyUSB0
GPS_BAUDRATE=9600
TIME_SYNC_INTERVAL=3600000
```

#### 步骤 5：启动服务

```bash
npm start
```

#### 步骤 6：验证

1. 查看服务器日志，应显示"📡 GPS 已连接"
2. 访问 http://localhost:3000
3. 点击 ⚙️ 设置 → 时间设置
4. GPS 状态应显示"✅ 可用"

✅ 完成！系统将使用 GPS 卫星时间。

---

### 方式四：使用 GPS + PPS（超高精度）

**适用场景**：需要微秒级时间精度，工业级应用

#### 步骤 1：硬件连接

```
GPS 模块 TX  → 服务器串口 RX
GPS 模块 PPS → 服务器 GPIO 18（树莓派）
GPS 模块 GND → 服务器 GND
```

#### 步骤 2：配置 Linux 系统

```bash
# 加载 PPS 内核模块
sudo modprobe pps-gpio

# 永久加载（添加到 /etc/modules）
echo "pps-gpio" | sudo tee -a /etc/modules

# 树莓派：编辑 /boot/config.txt，添加：
# dtoverlay=pps-gpio,gpiopin=18

# 安装 pps-tools
sudo apt-get install pps-tools

# 重启系统
sudo reboot
```

#### 步骤 3：验证 PPS 设备

```bash
# 检查 PPS 设备
ls -l /dev/pps*
# 应该看到: /dev/pps0

# 测试 PPS 信号
sudo ppstest /dev/pps0
# 应该每秒输出一次脉冲信号
```

#### 步骤 4：配置环境变量

编辑 `.env` 文件：

```bash
TIME_SOURCE=gps-pps
GPS_PORT=/dev/ttyAMA0
GPS_BAUDRATE=9600
PPS_DEVICE=/dev/pps0
TIME_SYNC_INTERVAL=3600000
```

#### 步骤 5：启动服务

```bash
npm start
```

#### 步骤 6：验证

1. 查看服务器日志，应显示"📡 GPS 已连接"和"⚡ PPS 已连接"
2. 访问 http://localhost:3000
3. 点击 ⚙️ 设置 → 时间设置
4. GPS 状态应显示"✅ 可用"
5. PPS 状态应显示"✅ 可用"
6. PPS 偏移应显示纳秒级数值

✅ 完成！系统将使用 GPS + PPS 超高精度时间。

---

## 快速测试

### 测试 GPS 连接

```bash
# Linux
cat /dev/ttyUSB0

# 应该看到类似输出：
# $GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
```

### 测试 NTP 连接

```bash
# Linux
ntpdate -q pool.ntp.org

# 应该看到类似输出：
# server 185.125.190.58, stratum 2, offset -0.001234, delay 0.05678
```

## 常见问题

### Q: 如何知道使用哪种时间源？

**A**: 根据您的需求选择：
- 简单场景 → 本地时钟
- 有网络 → NTP 服务器（毫秒级）
- 高精度/无网络 → GPS NMEA（秒级）
- 超高精度 → GPS + PPS（微秒级）

### Q: GPS 需要什么硬件？

**A**: 
- GPS 模块（支持 NMEA 协议）
- USB 转串口线（如果是 USB 接口）
- GPS 天线（通常模块自带）

**推荐模块**：
- **GPS NMEA**：u-blox NEO-6M, NEO-7M, NEO-M8N
- **GPS + PPS**：u-blox NEO-M8N, NEO-M9N, LEA-6T, M8T

### Q: GPS PPS 需要什么？

**A**:
- 支持 PPS 输出的 GPS 模块
- GPIO 连接（树莓派或工控机）
- Linux 系统（支持 pps-gpio）
- pps-tools 工具包

**精度对比**：
- GPS NMEA：秒级精度
- GPS + PPS：微秒级精度（提升 1000 倍）

### Q: NTP 同步需要什么？

**A**: 
- 网络连接
- 开放 UDP 123 端口
- 无需额外硬件

### Q: 可以同时使用多个时间源吗？

**A**: 
- 不可以，系统同时只能使用一个时间源
- 但可以配置降级方案（GPS 不可用时自动使用本地时钟）

### Q: 时间同步会影响历史数据吗？

**A**: 
- 不会，历史数据的时间戳不会改变
- 只影响新采集的数据和显示格式

## 推荐配置

### 生产环境（有网络）

```bash
TIME_SOURCE=ntp
NTP_SERVER=pool.ntp.org
TIME_SYNC_INTERVAL=1800000  # 30分钟
```

### 生产环境（无网络，高精度）

```bash
TIME_SOURCE=gps
GPS_PORT=/dev/ttyUSB0
GPS_BAUDRATE=9600
TIME_SYNC_INTERVAL=3600000  # 1小时
```

### 生产环境（无网络，超高精度）

```bash
TIME_SOURCE=gps-pps
GPS_PORT=/dev/ttyAMA0
GPS_BAUDRATE=9600
PPS_DEVICE=/dev/pps0
TIME_SYNC_INTERVAL=3600000  # 1小时
```

### 开发/测试环境

```bash
TIME_SOURCE=local
# 无需其他配置
```

## 下一步

- 查看完整文档: [时间同步指南](TIME_SYNC_GUIDE.md)
- 配置时区: [时间设置指南](TIME_SETTINGS_GUIDE.md)
- 系统设置: [系统设置指南](SYSTEM_SETTINGS_GUIDE.md)

---

**提示**: 首次使用 GPS 时，可能需要几分钟进行冷启动和卫星定位。
