# GPS PPS 高精度时间同步配置指南

## 什么是 PPS？

PPS（Pulse Per Second，每秒脉冲）是 GPS 模块输出的高精度时间信号：

- **精度**：微秒级甚至纳秒级
- **原理**：每秒在 UTC 秒边界输出一个精确脉冲
- **优势**：独立于串口通信，硬件级时间基准

## 精度对比

| 时间源 | 精度 | 抖动 | 适用场景 |
|--------|------|------|----------|
| 本地时钟 | ±秒级 | 大 | 开发测试 |
| NTP | ±10ms | 1-100ms | 一般应用 |
| GPS NMEA | ±1s | 100-500ms | 高精度应用 |
| **GPS + PPS** | **±1μs** | **<1μs** | **超高精度应用** |

## 硬件要求

### 1. GPS 模块

必须支持 PPS 输出，推荐模块：

**入门级**：
- u-blox NEO-M8N（约 ¥50-100）
- u-blox NEO-M9N（约 ¥100-150）

**专业级**：
- u-blox LEA-6T（约 ¥200-300）
- u-blox M8T（约 ¥300-500）

**特点**：
- 支持 PPS 输出
- NMEA 0183 协议
- 冷启动时间 < 30秒
- 定位精度 2.5m

### 2. 连接方式

#### 树莓派连接

```
GPS 模块          树莓派
---------        --------
VCC      →       3.3V (Pin 1)
GND      →       GND (Pin 6)
TX       →       RX (GPIO 15, Pin 10)
RX       →       TX (GPIO 14, Pin 8)
PPS      →       GPIO 18 (Pin 12)  ← 关键！
```

#### 工控机连接

```
GPS 模块          串口
---------        --------
TX       →       RX
RX       →       TX
PPS      →       DCD (Data Carrier Detect)
GND      →       GND
```

### 3. 系统要求

- **操作系统**：Linux（内核 2.6.34+）
- **内核模块**：pps-gpio
- **工具包**：pps-tools
- **权限**：root 或 dialout 组

## 配置步骤

### 步骤 1：硬件连接

1. 按照上述接线图连接 GPS 模块
2. 确保 PPS 引脚连接到正确的 GPIO
3. 检查电源和地线连接

### 步骤 2：配置设备树（树莓派）

编辑 `/boot/config.txt`：

```bash
sudo nano /boot/config.txt
```

添加以下内容：

```bash
# 启用 PPS GPIO（使用 GPIO 18）
dtoverlay=pps-gpio,gpiopin=18

# 可选：禁用蓝牙以释放串口
dtoverlay=disable-bt
```

保存并重启：

```bash
sudo reboot
```

### 步骤 3：加载 PPS 内核模块

```bash
# 临时加载
sudo modprobe pps-gpio

# 永久加载
echo "pps-gpio" | sudo tee -a /etc/modules
```

### 步骤 4：安装 pps-tools

```bash
# Debian/Ubuntu/树莓派 OS
sudo apt-get update
sudo apt-get install pps-tools

# CentOS/RHEL
sudo yum install pps-tools

# Arch Linux
sudo pacman -S pps-tools
```

### 步骤 5：验证 PPS 设备

```bash
# 检查 PPS 设备
ls -l /dev/pps*

# 应该看到：
# crw------- 1 root root 248, 0 Dec  1 12:00 /dev/pps0
```

### 步骤 6：测试 PPS 信号

```bash
# 实时监控 PPS 脉冲
sudo ppstest /dev/pps0
```

**正常输出示例**：

```
trying PPS source "/dev/pps0"
found PPS source "/dev/pps0"
ok, found 1 source(s), now start fetching data...
source 0 - assert 1638360000.000000123, sequence: 1
source 0 - assert 1638360001.000000089, sequence: 2
source 0 - assert 1638360002.000000156, sequence: 3
source 0 - assert 1638360003.000000112, sequence: 4
```

**关键指标**：
- ✅ 每秒输出一次
- ✅ 时间戳小数部分 < 1000 纳秒
- ✅ sequence 连续递增
- ✅ 无丢失或跳跃

### 步骤 7：配置串口权限

```bash
# 方法 1：添加用户到 dialout 组
sudo usermod -a -G dialout $USER

# 方法 2：直接修改权限
sudo chmod 666 /dev/ttyAMA0
sudo chmod 666 /dev/pps0

# 注销并重新登录使组权限生效
```

### 步骤 8：配置系统

编辑 `.env` 文件：

```bash
# 时间源设置为 GPS + PPS
TIME_SOURCE=gps-pps

# GPS 串口配置
GPS_PORT=/dev/ttyAMA0
GPS_BAUDRATE=9600

# PPS 设备配置
PPS_DEVICE=/dev/pps0

# 同步间隔（1小时）
TIME_SYNC_INTERVAL=3600000
```

### 步骤 9：启动服务

```bash
npm start
```

### 步骤 10：验证运行

1. 查看服务器日志：
   ```
   📡 GPS 已连接
   ⚡ PPS 已连接
   时间同步管理器初始化 - 时间源: gps-pps
   ```

2. 访问 Web 界面：http://localhost:3000

3. 打开系统设置 → 时间设置

4. 检查状态：
   - GPS 状态：✅ 可用
   - PPS 状态：✅ 可用
   - PPS 偏移：显示纳秒级数值

## 故障排除

### 问题 1：找不到 /dev/pps0

**症状**：
```bash
ls: cannot access '/dev/pps0': No such file or directory
```

**解决方法**：

1. 检查内核模块是否加载：
   ```bash
   lsmod | grep pps
   ```

2. 手动加载模块：
   ```bash
   sudo modprobe pps-gpio
   ```

3. 检查设备树配置（树莓派）：
   ```bash
   sudo nano /boot/config.txt
   # 确保有: dtoverlay=pps-gpio,gpiopin=18
   ```

4. 查看内核日志：
   ```bash
   dmesg | grep pps
   ```

### 问题 2：ppstest 无输出

**症状**：
```bash
sudo ppstest /dev/pps0
# 长时间无输出
```

**解决方法**：

1. 检查 PPS 引脚连接
2. 确认 GPS 模块支持 PPS
3. 检查 GPS 是否已定位（需要看到卫星）
4. 查看 GPS 模块指示灯（应该闪烁）
5. 测试 GPS 串口数据：
   ```bash
   cat /dev/ttyAMA0
   # 应该看到 NMEA 数据
   ```

### 问题 3：PPS 精度不稳定

**症状**：PPS 偏移值波动大（> 1000 纳秒）

**解决方法**：

1. **改善 GPS 信号**：
   - 将天线移到窗边或室外
   - 避免金属遮挡
   - 等待更多卫星定位

2. **优化系统**：
   ```bash
   # 减少系统中断延迟
   sudo apt-get install cpufrequtils
   sudo cpufreq-set -g performance
   ```

3. **使用屏蔽线**：
   - PPS 信号线使用屏蔽线
   - 减少电磁干扰

4. **考虑实时内核**（高级）：
   ```bash
   # 安装 PREEMPT_RT 内核
   sudo apt-get install linux-image-rt-amd64
   ```

### 问题 4：权限被拒绝

**症状**：
```bash
Error: Permission denied, cannot open /dev/pps0
```

**解决方法**：

```bash
# 临时解决
sudo chmod 666 /dev/pps0

# 永久解决：创建 udev 规则
sudo nano /etc/udev/rules.d/99-pps.rules

# 添加内容：
KERNEL=="pps0", MODE="0666"

# 重新加载 udev 规则
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## 性能优化

### 1. 系统调优

```bash
# 设置 CPU 为性能模式
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# 禁用不必要的服务
sudo systemctl disable bluetooth
sudo systemctl disable wifi
```

### 2. GPS 模块配置

某些 GPS 模块支持配置 PPS 脉冲宽度：

```bash
# 使用 u-center 软件（Windows）配置
# 或通过 UBX 协议发送配置命令
```

### 3. 监控脚本

创建监控脚本 `monitor_pps.sh`：

```bash
#!/bin/bash
while true; do
  echo "=== $(date) ==="
  sudo ppstest /dev/pps0 -c 5
  sleep 60
done
```

运行：
```bash
chmod +x monitor_pps.sh
./monitor_pps.sh
```

## 应用场景

### 1. 工业数据采集

- 多设备时间同步
- 高精度时间戳
- 事件关联分析

### 2. 科学测量

- 地震监测
- 天文观测
- 物理实验

### 3. 金融交易

- 交易时间戳
- 审计追踪
- 合规要求

### 4. 通信基站

- 基站时间同步
- 网络时钟分发
- 频率校准

## 参考资料

### 官方文档

- [Linux PPS 子系统](https://www.kernel.org/doc/html/latest/driver-api/pps.html)
- [u-blox GPS 模块手册](https://www.u-blox.com/en/docs)
- [树莓派 GPIO 文档](https://www.raspberrypi.org/documentation/hardware/raspberrypi/)

### 相关工具

- **pps-tools**：PPS 信号测试工具
- **gpsd**：GPS 守护进程（可选）
- **chrony**：高精度 NTP 服务器（可选）

### 推荐阅读

- [GPS 时间同步原理](https://en.wikipedia.org/wiki/GPS_disciplined_oscillator)
- [PPS 信号规范](https://en.wikipedia.org/wiki/Pulse-per-second_signal)
- [NMEA 0183 协议](https://en.wikipedia.org/wiki/NMEA_0183)

## 常见问题

### Q: PPS 和 NMEA 有什么区别？

**A**: 
- **NMEA**：通过串口传输的文本数据，包含时间、位置等信息，精度受串口通信影响（秒级）
- **PPS**：硬件脉冲信号，每秒在 UTC 秒边界输出，精度极高（微秒级）
- **配合使用**：NMEA 提供粗略时间，PPS 提供精确秒边界

### Q: 所有 GPS 模块都支持 PPS 吗？

**A**: 不是。需要选择明确标注支持 PPS 输出的模块。查看模块规格书确认。

### Q: PPS 需要 GPS 定位吗？

**A**: 是的。GPS 模块需要定位到卫星后才能输出准确的 PPS 信号。冷启动可能需要几分钟。

### Q: 可以在 Windows 上使用 PPS 吗？

**A**: 理论上可以，但 Windows 对 PPS 的支持不如 Linux 完善。推荐使用 Linux 系统。

### Q: PPS 精度能达到多少？

**A**: 
- **GPS 模块输出**：通常 < 50 纳秒
- **系统捕获**：取决于 GPIO 中断延迟，通常 < 1 微秒
- **实际应用**：微秒级精度足够大多数应用

---

**版本**: v1.0.0  
**更新**: 2024-12-01  
**作者**: Modbus RTU Manager Team
