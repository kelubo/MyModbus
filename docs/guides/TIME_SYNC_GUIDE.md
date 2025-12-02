# 时间同步使用指南

## 功能概述

系统支持三种时间源：本地时钟、GPS 时间和 NTP 服务器，确保系统时间的准确性和可靠性。

## 时间源类型

### 1. 本地时钟（Local）

**说明**：使用服务器的系统时间

**优点**：
- 无需额外硬件
- 响应速度快
- 配置简单

**缺点**：
- 可能存在时间漂移
- 依赖系统时间准确性

**适用场景**：
- 单机部署
- 对时间精度要求不高
- 无网络连接环境

### 2. GPS 时间（GPS NMEA）

**说明**：通过 GPS 模块的 NMEA 协议获取卫星时间

**优点**：
- 高精度（秒级）
- 不依赖网络
- 全球可用
- 配置简单

**缺点**：
- 需要 GPS 硬件模块
- 需要天线和卫星信号
- 初始定位需要时间
- 精度受串口通信影响

**适用场景**：
- 中高精度时间要求
- 无网络环境
- 户外或工业现场

**硬件要求**：
- GPS 模块（支持 NMEA 协议）
- USB 转串口或直接串口连接
- 天线（室外或窗边）

### 3. GPS + PPS 高精度时间（GPS-PPS）

**说明**：通过 GPS 模块的 PPS（Pulse Per Second）信号获取高精度时间

**优点**：
- 超高精度（微秒级甚至纳秒级）
- 不依赖网络
- 全球可用
- 时间抖动极小

**缺点**：
- 需要支持 PPS 的 GPS 硬件
- 需要 GPIO 连接和内核支持
- 配置较复杂
- 需要 Linux 系统

**适用场景**：
- 超高精度时间要求
- 时间同步要求严格的工业应用
- 多设备精确时间同步
- 科学测量和数据采集

**硬件要求**：
- 支持 PPS 输出的 GPS 模块
- PPS 信号线连接到系统 GPIO
- Linux 系统（支持 pps-gpio 内核模块）
- pps-tools 工具包

**精度对比**：
| 时间源 | 精度 | 抖动 |
|--------|------|------|
| GPS NMEA | ±1 秒 | 100-500ms |
| GPS + PPS | ±1 微秒 | <1 微秒 |
| NTP | ±10 毫秒 | 1-100ms |

### 4. NTP 服务器（NTP）

**说明**：通过网络时间协议同步时间

**优点**：
- 无需额外硬件
- 精度较高（毫秒级）
- 配置简单

**缺点**：
- 需要网络连接
- 依赖 NTP 服务器可用性
- 网络延迟影响精度

**适用场景**：
- 有网络连接
- 对精度要求中等
- 多节点时间同步

**推荐服务器**：
- pool.ntp.org（全球）
- time.google.com（Google）
- time.windows.com（Microsoft）
- ntp.aliyun.com（阿里云）
- cn.ntp.org.cn（中国）

## 配置方法

### 方式一：通过界面配置

1. 点击右上角 **⚙️ 设置按钮**
2. 切换到 **时间设置** 标签页
3. 选择 **时间源**
4. 配置相关参数
5. 点击 **保存设置**

### 方式二：通过环境变量

编辑 `.env` 文件：

```bash
# 时间源：local, gps, gps-pps, ntp
TIME_SOURCE=local

# GPS 配置（仅当 TIME_SOURCE=gps 或 gps-pps 时需要）
GPS_PORT=/dev/ttyUSB0
GPS_BAUDRATE=9600

# PPS 配置（仅当 TIME_SOURCE=gps-pps 时需要）
PPS_DEVICE=/dev/pps0

# NTP 配置（仅当 TIME_SOURCE=ntp 时需要）
NTP_SERVER=pool.ntp.org

# 同步间隔（毫秒）
TIME_SYNC_INTERVAL=3600000
```

## GPS 配置详解

### 硬件连接

1. **USB GPS 模块（NMEA）**
   ```
   GPS 模块 → USB 线 → 服务器 USB 口
   ```

2. **串口 GPS 模块（NMEA）**
   ```
   GPS 模块 → 串口线 → 服务器串口
   ```

3. **GPS + PPS 模块（高精度）**
   ```
   GPS 模块 TX → 服务器串口 RX（NMEA 数据）
   GPS 模块 PPS → 服务器 GPIO（PPS 脉冲信号）
   GPS 模块 GND → 服务器 GND
   ```

### 串口识别

**Linux**：
```bash
# 查看串口设备
ls /dev/ttyUSB* /dev/ttyACM*

# 查看串口信息
dmesg | grep tty

# 测试 GPS 数据
cat /dev/ttyUSB0
```

**Windows**：
```
设备管理器 → 端口(COM和LPT) → 查看 COM 端口号
```

### 串口权限（Linux）

```bash
# 添加用户到 dialout 组
sudo usermod -a -G dialout $USER

# 或直接修改权限
sudo chmod 666 /dev/ttyUSB0
```

### GPS 数据格式

系统支持标准 NMEA 0183 协议，主要解析 RMC 语句：

```
$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
```

字段说明：
- 123519：UTC 时间 12:35:19
- A：状态（A=有效，V=无效）
- 230394：日期 23/03/1994

## GPS PPS 配置详解

### PPS 信号原理

PPS（Pulse Per Second）是 GPS 模块输出的每秒一次的精确脉冲信号：
- 每秒在 UTC 秒边界输出一个脉冲
- 脉冲上升沿精度可达纳秒级
- 独立于 NMEA 串口数据
- 提供硬件级时间基准

### 硬件要求

1. **GPS 模块**
   - 必须支持 PPS 输出
   - 推荐模块：
     - u-blox NEO-M8N/M9N
     - u-blox LEA-6T/M8T（高精度）
     - Adafruit Ultimate GPS
     - Beitian BN-880

2. **GPIO 连接**
   - 树莓派：GPIO 引脚（如 GPIO 18）
   - 工控机：串口 DCD 引脚
   - 开发板：任意 GPIO 引脚

3. **系统要求**
   - Linux 系统（内核 2.6.34+）
   - pps-gpio 内核模块
   - pps-tools 工具包

### Linux 系统配置

#### 1. 加载 PPS 内核模块

```bash
# 临时加载
sudo modprobe pps-gpio

# 永久加载（添加到 /etc/modules）
echo "pps-gpio" | sudo tee -a /etc/modules
```

#### 2. 配置设备树（树莓派）

编辑 `/boot/config.txt`：

```bash
# 启用 PPS GPIO（使用 GPIO 18）
dtoverlay=pps-gpio,gpiopin=18
```

重启后生效：
```bash
sudo reboot
```

#### 3. 安装 pps-tools

```bash
# Debian/Ubuntu
sudo apt-get install pps-tools

# CentOS/RHEL
sudo yum install pps-tools

# Arch Linux
sudo pacman -S pps-tools
```

#### 4. 验证 PPS 设备

```bash
# 检查 PPS 设备
ls -l /dev/pps*

# 应该看到：
# crw------- 1 root root 248, 0 Dec  1 12:00 /dev/pps0
```

#### 5. 测试 PPS 信号

```bash
# 实时监控 PPS 脉冲
sudo ppstest /dev/pps0

# 输出示例：
# trying PPS source "/dev/pps0"
# found PPS source "/dev/pps0"
# ok, found 1 source(s), now start fetching data...
# source 0 - assert 1638360000.000000123, sequence: 1
# source 0 - assert 1638360001.000000089, sequence: 2
# source 0 - assert 1638360002.000000156, sequence: 3
```

### 硬件连接示例

#### 树莓派 + u-blox NEO-M8N

```
GPS 模块          树莓派
---------        --------
VCC      →       3.3V (Pin 1)
GND      →       GND (Pin 6)
TX       →       RX (GPIO 15, Pin 10)
RX       →       TX (GPIO 14, Pin 8)
PPS      →       GPIO 18 (Pin 12)
```

#### 工控机 + GPS 模块

```
GPS 模块          串口
---------        --------
TX       →       RX
RX       →       TX
PPS      →       DCD (Data Carrier Detect)
GND      →       GND
```

### 系统配置

#### 方式一：环境变量

```bash
# .env
TIME_SOURCE=gps-pps
GPS_PORT=/dev/ttyAMA0
GPS_BAUDRATE=9600
PPS_DEVICE=/dev/pps0
TIME_SYNC_INTERVAL=3600000
```

#### 方式二：界面配置

1. 打开系统设置
2. 切换到"时间设置"标签
3. 时间源选择"GPS + PPS (高精度)"
4. 配置 GPS 串口和波特率
5. 配置 PPS 设备路径
6. 保存设置

### PPS 状态监控

系统会显示以下 PPS 状态信息：

- **PPS 状态**：✅ 可用 / ❌ 不可用
- **PPS 偏移**：纳秒级时间偏移
- **最后同步**：最后一次 PPS 校准时间

### 精度验证

使用 `ppstest` 验证 PPS 精度：

```bash
sudo ppstest /dev/pps0
```

**良好的 PPS 信号特征**：
- 每秒稳定输出一次脉冲
- 时间戳小数部分接近 0（纳秒级）
- sequence 序号连续递增
- 无丢失或跳跃

**示例输出**：
```
source 0 - assert 1638360000.000000123, sequence: 1  ← 123 纳秒偏移
source 0 - assert 1638360001.000000089, sequence: 2  ← 89 纳秒偏移
source 0 - assert 1638360002.000000156, sequence: 3  ← 156 纳秒偏移
```

## NTP 配置详解

### 服务器选择

**全球服务器**：
```bash
NTP_SERVER=pool.ntp.org
```

**区域服务器**（更快）：
```bash
# 亚洲
NTP_SERVER=asia.pool.ntp.org

# 中国
NTP_SERVER=cn.pool.ntp.org

# 欧洲
NTP_SERVER=europe.pool.ntp.org

# 北美
NTP_SERVER=north-america.pool.ntp.org
```

**企业服务器**：
```bash
# Google
NTP_SERVER=time.google.com

# Cloudflare
NTP_SERVER=time.cloudflare.com

# 阿里云
NTP_SERVER=ntp.aliyun.com
```

### 防火墙配置

NTP 使用 UDP 端口 123：

```bash
# Linux (iptables)
sudo iptables -A OUTPUT -p udp --dport 123 -j ACCEPT

# Linux (firewalld)
sudo firewall-cmd --add-service=ntp --permanent
sudo firewall-cmd --reload
```

## 同步间隔设置

| 间隔 | 毫秒值 | 适用场景 |
|------|--------|----------|
| 5 分钟 | 300000 | 高精度要求 |
| 15 分钟 | 900000 | 一般精度 |
| 30 分钟 | 1800000 | 标准配置 |
| 1 小时 | 3600000 | 推荐配置 |
| 2 小时 | 7200000 | 低频同步 |
| 24 小时 | 86400000 | 最低频率 |

**建议**：
- GPS：1-2 小时（GPS 时间稳定）
- NTP：30 分钟-1 小时（平衡精度和网络负载）
- Local：不需要同步

## 使用示例

### 示例 1：使用本地时钟

```bash
# .env
TIME_SOURCE=local
```

**配置步骤**：
1. 确保服务器系统时间准确
2. 设置时间源为"本地时钟"
3. 保存设置

### 示例 2：使用 GPS 时间（NMEA）

```bash
# .env
TIME_SOURCE=gps
GPS_PORT=/dev/ttyUSB0
GPS_BAUDRATE=9600
TIME_SYNC_INTERVAL=3600000
```

**配置步骤**：
1. 连接 GPS 模块到服务器
2. 确认串口设备路径
3. 设置串口权限
4. 配置 GPS 参数
5. 保存设置并重启

**验证**：
- 查看时间同步状态
- GPS 状态应显示"✅ 可用"
- 最后同步时间应更新

### 示例 3：使用 GPS + PPS 高精度时间

```bash
# .env
TIME_SOURCE=gps-pps
GPS_PORT=/dev/ttyAMA0
GPS_BAUDRATE=9600
PPS_DEVICE=/dev/pps0
TIME_SYNC_INTERVAL=3600000
```

**配置步骤**：
1. 连接 GPS 模块的 TX/RX 到串口
2. 连接 GPS 模块的 PPS 引脚到 GPIO
3. 加载 pps-gpio 内核模块
4. 安装 pps-tools
5. 验证 PPS 设备：`sudo ppstest /dev/pps0`
6. 配置系统参数
7. 保存设置并重启

**验证**：
- GPS 状态应显示"✅ 可用"
- PPS 状态应显示"✅ 可用"
- PPS 偏移应显示纳秒级数值
- 使用 `ppstest` 验证信号质量

### 示例 4：使用 NTP 服务器

```bash
# .env
TIME_SOURCE=ntp
NTP_SERVER=pool.ntp.org
TIME_SYNC_INTERVAL=1800000
```

**配置步骤**：
1. 确保服务器有网络连接
2. 选择合适的 NTP 服务器
3. 配置 NTP 参数
4. 保存设置

**验证**：
- 点击"立即同步"测试
- 检查同步是否成功
- 查看最后同步时间

## 时间同步状态

### 状态指示

**当前时间源**：
- 本地时钟
- GPS 时间
- NTP 服务器

**最后同步**：
- 显示最后一次成功同步的时间
- "从未同步"表示尚未同步

**GPS 状态**：
- ✅ 可用：GPS 模块正常工作
- ❌ 不可用：GPS 模块未连接或无信号

**PPS 状态**（仅 GPS-PPS 模式）：
- ✅ 可用：PPS 信号正常
- ❌ 不可用：PPS 设备未找到或无信号

**PPS 偏移**（仅 GPS-PPS 模式）：
- 显示纳秒级时间偏移
- 数值越小表示精度越高

### 手动同步

点击 **"立即同步"** 按钮可以手动触发时间同步。

## API 接口

### 获取时间状态

```bash
GET /api/time/status
```

响应：
```json
{
  "source": "gps-pps",
  "currentTime": "2024-12-01T12:00:00.000Z",
  "lastSync": "2024-12-01T11:00:00.000Z",
  "isGPSAvailable": true,
  "isPPSAvailable": true,
  "ppsOffset": 123,
  "syncInterval": 3600000
}
```

### 手动同步时间

```bash
POST /api/time/sync
```

响应：
```json
{
  "success": true,
  "time": "2024-12-01T12:00:00.000Z",
  "timestamp": 1701432000000
}
```

### 切换时间源

```bash
POST /api/time/source
Content-Type: application/json

{
  "source": "gps-pps"
}
```

支持的时间源：
- `local` - 本地时钟
- `gps` - GPS NMEA 时间
- `gps-pps` - GPS + PPS 高精度时间
- `ntp` - NTP 服务器

## 故障排除

### GPS 无法连接

**症状**：GPS 状态显示"❌ 不可用"

**解决方法**：
1. 检查 GPS 模块是否连接
2. 确认串口路径正确
3. 检查串口权限
4. 查看服务器日志
5. 测试 GPS 数据：`cat /dev/ttyUSB0`

### NTP 同步失败

**症状**：同步时提示失败

**解决方法**：
1. 检查网络连接
2. 测试 NTP 服务器：`ntpdate -q pool.ntp.org`
3. 检查防火墙设置
4. 更换 NTP 服务器
5. 检查 UDP 123 端口

### 时间不准确

**症状**：同步后时间仍然不准

**解决方法**：
1. 检查时区设置
2. 确认时间源正常工作
3. 减小同步间隔
4. 切换到更可靠的时间源
5. 检查系统时间设置

### GPS 信号弱

**症状**：GPS 连接但无法获取时间

**解决方法**：
1. 将天线移到窗边或室外
2. 等待 GPS 冷启动（可能需要几分钟）
3. 检查天线连接
4. 避免金属遮挡
5. 查看 GPS 模块指示灯

### PPS 信号无法检测

**症状**：PPS 状态显示"❌ 不可用"

**解决方法**：
1. 检查 PPS 设备是否存在：`ls -l /dev/pps*`
2. 加载内核模块：`sudo modprobe pps-gpio`
3. 检查 GPIO 连接是否正确
4. 验证 GPS 模块是否支持 PPS
5. 测试 PPS 信号：`sudo ppstest /dev/pps0`
6. 检查设备树配置（树莓派）
7. 查看内核日志：`dmesg | grep pps`

### PPS 精度不稳定

**症状**：PPS 偏移值波动大

**解决方法**：
1. 检查 GPIO 连接质量
2. 使用屏蔽线连接 PPS 信号
3. 确保 GPS 有良好的卫星信号
4. 减少系统负载
5. 使用实时内核（PREEMPT_RT）
6. 检查电源稳定性

## 最佳实践

1. **选择合适的时间源**
   - 超高精度（微秒级）：GPS + PPS
   - 高精度（秒级）：GPS NMEA
   - 有网络（毫秒级）：NTP
   - 简单场景：本地时钟

2. **配置合理的同步间隔**
   - GPS + PPS：1-2 小时（PPS 持续校准）
   - GPS NMEA：1-2 小时
   - NTP：30 分钟-1 小时

3. **监控同步状态**
   - 定期检查同步状态
   - 关注 GPS 和 PPS 可用性
   - 监控 PPS 偏移值
   - 记录同步失败

4. **备用方案**
   - PPS 不可用时自动降级到 GPS NMEA
   - GPS 不可用时自动降级到本地时钟
   - NTP 失败时使用本地时间
   - 配置多个 NTP 服务器

5. **安全考虑**
   - 使用可信的 NTP 服务器
   - 限制 NTP 端口访问
   - 定期更新 GPS 固件
   - 保护 PPS GPIO 引脚

6. **PPS 优化**
   - 使用屏蔽线连接 PPS 信号
   - 减少系统中断延迟
   - 考虑使用实时内核
   - 确保 GPS 天线位置良好

## 相关文档

- [时间设置指南](TIME_SETTINGS_GUIDE.md)
- [系统设置指南](SYSTEM_SETTINGS_GUIDE.md)
- [快速开始](docs/QUICK_START.md)

---

**版本**: v1.0.0  
**更新**: 2024-12-01
