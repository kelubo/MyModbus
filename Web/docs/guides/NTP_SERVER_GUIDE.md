# NTP 服务器使用指南

## 功能概述

系统支持作为 NTP 服务器运行，向其他设备提供时间同步服务。NTP 服务器可以使用以下时钟源：

- **本地时钟** - 使用系统时间
- **GPS 时间** - 使用 GPS 卫星时间（秒级精度）
- **GPS + PPS** - 使用 GPS + PPS 高精度时间（微秒级精度）

## 架构设计

```
┌─────────────────────────────────────────┐
│         时间同步管理器 (TimeSync)         │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ 本地时钟  │ GPS NMEA │  GPS + PPS   │ │
│  └──────────┴──────────┴──────────────┘ │
└──────────────────┬──────────────────────┘
                   │ 提供时间
                   ↓
┌─────────────────────────────────────────┐
│          NTP 服务器 (NTPServer)          │
│  - 监听 UDP 123 端口                     │
│  - 处理 NTP 请求                         │
│  - 返回高精度时间                        │
└──────────────────┬──────────────────────┘
                   │ NTP 协议
                   ↓
┌─────────────────────────────────────────┐
│              客户端设备                  │
│  - 工控机                                │
│  - 服务器                                │
│  - 嵌入式设备                            │
│  - 其他需要时间同步的设备                │
└─────────────────────────────────────────┘
```

## 使用场景

### 场景 1：GPS 时间分发

**需求**：工业现场有多台设备需要精确时间同步，但只有一台设备连接了 GPS 模块。

**方案**：
1. 主设备连接 GPS 模块
2. 主设备启用 NTP 服务器，使用 GPS 作为时钟源
3. 其他设备配置为 NTP 客户端，从主设备同步时间

**优势**：
- 只需一个 GPS 模块
- 所有设备时间一致
- 成本低，易于维护

### 场景 2：高精度时间分发

**需求**：多台数据采集设备需要微秒级时间同步。

**方案**：
1. 主设备连接 GPS + PPS
2. 主设备启用 NTP 服务器，使用 GPS-PPS 作为时钟源
3. 其他设备通过 NTP 同步时间

**精度**：
- 主设备：±1 微秒（GPS + PPS）
- 客户端：±1-10 毫秒（NTP 网络延迟）

### 场景 3：内网时间服务器

**需求**：内网环境无法访问外部 NTP 服务器。

**方案**：
1. 部署本系统作为内网 NTP 服务器
2. 使用 GPS 或本地时钟作为时钟源
3. 内网设备从本服务器同步时间

## 配置方法

### 方式一：环境变量配置

编辑 `.env` 文件：

```bash
# 启用 NTP 服务器
NTP_SERVER_ENABLED=true

# NTP 服务器端口（默认 123）
NTP_SERVER_PORT=123

# NTP 服务器层级（1=主时钟源）
NTP_STRATUM=1

# 时钟源（自动使用 TIME_SOURCE）
TIME_SOURCE=gps-pps
GPS_PORT=/dev/ttyAMA0
GPS_BAUDRATE=9600
PPS_DEVICE=/dev/pps0
```

### 方式二：Web 界面配置

1. 打开系统设置（⚙️ 按钮）
2. 切换到"时间设置"标签页
3. 滚动到"NTP 服务器"部分
4. 勾选"启用 NTP 服务器"
5. 配置时钟源和端口
6. 点击"启动服务器"

## 配置参数说明

### 时钟源 (Clock Source)

| 时钟源 | 精度 | 层级 | 适用场景 |
|--------|------|------|----------|
| **GPS + PPS** | ±1μs | 1 | 超高精度应用 |
| **GPS NMEA** | ±1s | 1 | 高精度应用 |
| **本地时钟** | ±秒级 | 10 | 一般应用 |

### 服务器端口 (Port)

- **默认端口**：123（标准 NTP 端口）
- **权限要求**：端口 123 需要 root 权限
- **替代方案**：使用 1123 或其他高端口（无需 root）

### 层级 (Stratum)

NTP 层级表示时钟源的可靠性：

- **Stratum 0**：原子钟、GPS 卫星（硬件）
- **Stratum 1**：直接连接到 Stratum 0 的服务器（本系统使用 GPS）
- **Stratum 2**：从 Stratum 1 同步的服务器
- **Stratum 10**：本地时钟（不太可靠）

**建议配置**：
- GPS/GPS-PPS 时钟源：Stratum = 1
- 本地时钟：Stratum = 10

## 启动 NTP 服务器

### 使用 root 权限（端口 123）

```bash
# 方法 1：使用 sudo 启动
sudo npm start

# 方法 2：使用 setcap 授权（推荐）
sudo setcap 'cap_net_bind_service=+ep' $(which node)
npm start
```

### 使用非特权端口（1123）

```bash
# .env
NTP_SERVER_PORT=1123

# 正常启动
npm start
```

客户端配置：
```bash
# 指定端口
ntpdate -p 1123 <服务器IP>
```

## 客户端配置

### Linux 客户端

#### 方法 1：使用 ntpdate（一次性同步）

```bash
# 测试连接
ntpdate -q <服务器IP>

# 同步时间
sudo ntpdate <服务器IP>
```

#### 方法 2：使用 ntpd（持续同步）

编辑 `/etc/ntp.conf`：

```bash
# 注释掉默认服务器
# server 0.pool.ntp.org
# server 1.pool.ntp.org

# 添加本地 NTP 服务器
server <服务器IP> iburst prefer

# 允许本地时间偏差较大
tinker panic 0
```

重启 ntpd：
```bash
sudo systemctl restart ntp
```

#### 方法 3：使用 chrony（推荐）

编辑 `/etc/chrony/chrony.conf`：

```bash
# 添加本地 NTP 服务器
server <服务器IP> iburst prefer

# 允许快速同步
makestep 1 3
```

重启 chrony：
```bash
sudo systemctl restart chrony
```

查看状态：
```bash
chronyc sources
chronyc tracking
```

### Windows 客户端

#### 方法 1：命令行配置

```cmd
# 设置 NTP 服务器
w32tm /config /manualpeerlist:"<服务器IP>" /syncfromflags:manual /reliable:yes /update

# 重启时间服务
net stop w32time
net start w32time

# 立即同步
w32tm /resync

# 查看状态
w32tm /query /status
```

#### 方法 2：图形界面配置

1. 右键点击任务栏时间 → 调整日期/时间
2. 点击"其他日期、时间和区域设置"
3. 点击"设置时间和日期"
4. 切换到"Internet 时间"标签
5. 点击"更改设置"
6. 输入服务器 IP 地址
7. 点击"立即更新"

### 嵌入式设备（Arduino/ESP32）

```cpp
#include <NTPClient.h>
#include <WiFiUdp.h>

WiFiUDP ntpUDP;
// 使用本地 NTP 服务器
NTPClient timeClient(ntpUDP, "<服务器IP>", 0, 60000);

void setup() {
  Serial.begin(115200);
  WiFi.begin("SSID", "PASSWORD");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  
  timeClient.begin();
}

void loop() {
  timeClient.update();
  Serial.println(timeClient.getFormattedTime());
  delay(1000);
}
```

## 监控和管理

### Web 界面监控

系统设置 → 时间设置 → NTP 服务器状态：

- **运行状态**：✅ 运行中 / ❌ 已停止
- **时钟源**：当前使用的时钟源
- **请求次数**：累计处理的 NTP 请求数
- **最后请求**：最后一次请求的时间

### API 接口

#### 获取服务器状态

```bash
GET /api/ntp/server/status
```

响应：
```json
{
  "isRunning": true,
  "port": 123,
  "clockSource": "gps-pps",
  "stratum": 1,
  "precision": -20,
  "requestCount": 1234,
  "lastRequestTime": "2024-12-01T12:00:00.000Z"
}
```

#### 启动服务器

```bash
POST /api/ntp/server/start
```

#### 停止服务器

```bash
POST /api/ntp/server/stop
```

#### 更新配置

```bash
POST /api/ntp/server/config
Content-Type: application/json

{
  "clockSource": "gps-pps",
  "stratum": 1
}
```

### 命令行监控

```bash
# 查看 NTP 服务器日志
tail -f logs/ntp-server.log

# 测试 NTP 服务器
ntpdate -q localhost

# 查看端口监听
sudo netstat -ulnp | grep 123
```

## 故障排除

### 问题 1：端口 123 绑定失败

**症状**：
```
Error: listen EACCES: permission denied 0.0.0.0:123
```

**解决方法**：

1. **使用 sudo 启动**：
   ```bash
   sudo npm start
   ```

2. **授权 Node.js**：
   ```bash
   sudo setcap 'cap_net_bind_service=+ep' $(which node)
   ```

3. **使用其他端口**：
   ```bash
   # .env
   NTP_SERVER_PORT=1123
   ```

### 问题 2：客户端无法连接

**症状**：客户端 ntpdate 超时

**解决方法**：

1. **检查防火墙**：
   ```bash
   # Linux (iptables)
   sudo iptables -A INPUT -p udp --dport 123 -j ACCEPT
   
   # Linux (firewalld)
   sudo firewall-cmd --add-service=ntp --permanent
   sudo firewall-cmd --reload
   
   # Windows
   # 控制面板 → Windows 防火墙 → 高级设置 → 入站规则
   # 新建规则 → 端口 → UDP 123 → 允许连接
   ```

2. **检查服务器状态**：
   ```bash
   # 确认服务器正在运行
   sudo netstat -ulnp | grep 123
   ```

3. **测试网络连接**：
   ```bash
   # 从客户端 ping 服务器
   ping <服务器IP>
   ```

### 问题 3：时间不准确

**症状**：客户端同步后时间仍然不准

**解决方法**：

1. **检查服务器时钟源**：
   - 确认 GPS 信号良好
   - 检查 PPS 信号正常
   - 查看时间同步状态

2. **检查网络延迟**：
   ```bash
   # 测试网络延迟
   ping <服务器IP>
   
   # 如果延迟 > 100ms，考虑使用更近的服务器
   ```

3. **检查客户端配置**：
   - 确认客户端 NTP 服务正在运行
   - 检查客户端日志

### 问题 4：请求次数为 0

**症状**：NTP 服务器运行但无请求

**解决方法**：

1. **测试本地连接**：
   ```bash
   ntpdate -q localhost
   ```

2. **检查客户端配置**：
   - 确认客户端指向正确的服务器 IP
   - 检查客户端 NTP 服务状态

3. **查看服务器日志**：
   ```bash
   # 应该看到请求日志
   🕐 NTP 请求: 192.168.1.100:12345 [总计: 1]
   ```

## 性能优化

### 1. 使用高精度时钟源

```bash
# 使用 GPS + PPS 获得最高精度
TIME_SOURCE=gps-pps
```

### 2. 减少网络延迟

- 使用有线网络而非 WiFi
- 客户端和服务器在同一局域网
- 使用千兆网络

### 3. 系统优化

```bash
# 设置 CPU 为性能模式
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# 禁用不必要的服务
sudo systemctl disable bluetooth
```

## 安全考虑

### 1. 访问控制

```bash
# 使用防火墙限制访问
sudo iptables -A INPUT -p udp --dport 123 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 123 -j DROP
```

### 2. 监控异常请求

- 监控请求频率
- 记录客户端 IP
- 设置请求速率限制

### 3. 使用 VPN

对于远程访问，建议通过 VPN 连接后再使用 NTP 服务。

## 最佳实践

1. **选择合适的时钟源**
   - 高精度需求：GPS + PPS
   - 一般需求：GPS NMEA
   - 简单场景：本地时钟

2. **配置合理的层级**
   - GPS 时钟源：Stratum = 1
   - 本地时钟：Stratum = 10

3. **监控服务器状态**
   - 定期检查请求次数
   - 监控时钟源状态
   - 记录异常情况

4. **客户端配置**
   - 使用 iburst 选项加快初始同步
   - 配置多个 NTP 服务器作为备份
   - 定期检查同步状态

5. **网络优化**
   - 使用有线网络
   - 减少网络跳数
   - 避免高延迟链路

## 示例配置

### 示例 1：GPS 时间分发服务器

```bash
# .env
TIME_SOURCE=gps
GPS_PORT=/dev/ttyUSB0
GPS_BAUDRATE=9600

NTP_SERVER_ENABLED=true
NTP_SERVER_PORT=123
NTP_STRATUM=1
```

**客户端配置**：
```bash
# /etc/chrony/chrony.conf
server 192.168.1.100 iburst prefer
```

### 示例 2：高精度时间服务器

```bash
# .env
TIME_SOURCE=gps-pps
GPS_PORT=/dev/ttyAMA0
GPS_BAUDRATE=9600
PPS_DEVICE=/dev/pps0

NTP_SERVER_ENABLED=true
NTP_SERVER_PORT=123
NTP_STRATUM=1
```

### 示例 3：内网时间服务器

```bash
# .env
TIME_SOURCE=local

NTP_SERVER_ENABLED=true
NTP_SERVER_PORT=1123
NTP_STRATUM=10
```

## 相关文档

- [时间同步指南](TIME_SYNC_GUIDE.md)
- [GPS PPS 配置指南](GPS_PPS_SETUP.md)
- [时间同步快速开始](TIME_SYNC_QUICKSTART.md)

---

**版本**: v1.0.0  
**更新**: 2024-12-01
