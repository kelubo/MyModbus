# 树莓派部署指南

## 系统要求

- 树莓派 3B+ / 4B / 5 或更高版本
- Raspberry Pi OS (推荐 Lite 版本)
- 至少 1GB RAM
- 至少 4GB SD 卡空间
- Node.js >= 14.0

## 一、准备树莓派

### 1. 安装 Node.js

**方法一：使用 NodeSource 仓库（推荐）**

```bash
# 更新系统
sudo apt update
sudo apt upgrade -y

# 安装 Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

**方法二：使用 nvm（适合多版本管理）**

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载配置
source ~/.bashrc

# 安装 Node.js
nvm install 18
nvm use 18
```

### 2. 配置串口权限

```bash
# 将当前用户添加到 dialout 组
sudo usermod -a -G dialout $USER

# 查看串口设备
ls -l /dev/tty*

# 常见串口设备：
# /dev/ttyUSB0  - USB转串口
# /dev/ttyAMA0  - 树莓派硬件串口
# /dev/ttyS0    - 树莓派串口（部分型号）
```

**注意：** 添加到 dialout 组后需要重新登录才能生效

### 3. 启用硬件串口（如果使用 GPIO 串口）

编辑配置文件：
```bash
sudo nano /boot/config.txt
```

添加或修改以下内容：
```
# 启用串口
enable_uart=1

# 禁用蓝牙（释放硬件串口）
dtoverlay=disable-bt
```

禁用串口控制台：
```bash
sudo raspi-config
# 选择: Interface Options -> Serial Port
# Login shell: No
# Serial port hardware: Yes
```

重启树莓派：
```bash
sudo reboot
```

## 二、安装应用

### 1. 上传项目文件

**方法一：使用 Git**

```bash
# 安装 git
sudo apt install git -y

# 克隆项目
git clone <your-repo-url>
cd modbus-rtu-manager
```

**方法二：使用 SCP**

在你的电脑上：
```bash
scp -r modbus-rtu-manager/ pi@<树莓派IP>:~/
```

**方法三：使用 SFTP 工具**
- WinSCP (Windows)
- FileZilla (跨平台)

### 2. 安装依赖

```bash
cd modbus-rtu-manager
npm install
```

### 3. 测试运行

```bash
# 临时运行测试
node server.js
```

在浏览器访问：`http://<树莓派IP>:3000`

## 三、安装为系统服务

### 1. 添加执行权限

```bash
chmod +x *.sh
```

### 2. 安装服务

```bash
sudo bash install-service.sh
```

### 3. 验证服务

```bash
# 查看服务状态
sudo systemctl status modbus-rtu-manager

# 查看日志
sudo journalctl -u modbus-rtu-manager -f
```

### 4. 服务管理

```bash
# 启动
sudo systemctl start modbus-rtu-manager

# 停止
sudo systemctl stop modbus-rtu-manager

# 重启
sudo systemctl restart modbus-rtu-manager

# 查看状态
sudo systemctl status modbus-rtu-manager

# 查看日志
sudo journalctl -u modbus-rtu-manager -n 100
```

## 四、性能优化

### 1. 减少内存占用

编辑服务文件：
```bash
sudo nano /etc/systemd/system/modbus-rtu-manager.service
```

添加内存限制：
```ini
[Service]
Environment="NODE_OPTIONS=--max-old-space-size=256"
```

重新加载并重启：
```bash
sudo systemctl daemon-reload
sudo systemctl restart modbus-rtu-manager
```

### 2. 使用 Lite 版本系统

- 树莓派 OS Lite 版本占用更少资源
- 无图形界面，更适合服务器使用

### 3. 禁用不必要的服务

```bash
# 查看所有服务
systemctl list-unit-files --type=service

# 禁用不需要的服务（示例）
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
```

## 五、网络配置

### 1. 设置静态 IP

编辑网络配置：
```bash
sudo nano /etc/dhcpcd.conf
```

添加静态 IP 配置：
```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

重启网络：
```bash
sudo systemctl restart dhcpcd
```

### 2. 配置防火墙（可选）

```bash
# 安装 ufw
sudo apt install ufw -y

# 允许 SSH
sudo ufw allow 22

# 允许应用端口
sudo ufw allow 3000

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

## 六、远程访问

### 1. 启用 SSH

```bash
sudo raspi-config
# 选择: Interface Options -> SSH -> Enable
```

### 2. 配置 SSH 密钥（推荐）

在你的电脑上：
```bash
# 生成密钥
ssh-keygen -t rsa -b 4096

# 复制公钥到树莓派
ssh-copy-id pi@<树莓派IP>
```

### 3. 使用 VNC（可选）

```bash
# 安装 VNC
sudo apt install realvnc-vnc-server -y

# 启用 VNC
sudo raspi-config
# 选择: Interface Options -> VNC -> Enable
```

## 七、数据备份

### 1. 备份数据库

```bash
# 创建备份目录
mkdir -p ~/backups

# 备份数据库
cp ~/modbus-rtu-manager/modbus.db ~/backups/modbus_$(date +%Y%m%d_%H%M%S).db
```

### 2. 自动备份脚本

创建备份脚本：
```bash
nano ~/backup-modbus.sh
```

内容：
```bash
#!/bin/bash
BACKUP_DIR=~/backups
DB_FILE=~/modbus-rtu-manager/modbus.db
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_FILE $BACKUP_DIR/modbus_$DATE.db

# 保留最近7天的备份
find $BACKUP_DIR -name "modbus_*.db" -mtime +7 -delete

echo "备份完成: modbus_$DATE.db"
```

添加执行权限：
```bash
chmod +x ~/backup-modbus.sh
```

添加定时任务：
```bash
crontab -e
```

添加每天凌晨2点备份：
```
0 2 * * * /home/pi/backup-modbus.sh
```

## 八、监控和维护

### 1. 查看系统资源

```bash
# CPU 和内存
htop

# 磁盘空间
df -h

# 温度
vcgencmd measure_temp
```

### 2. 查看应用日志

```bash
# 实时日志
sudo journalctl -u modbus-rtu-manager -f

# 最近的错误
sudo journalctl -u modbus-rtu-manager -p err -n 50

# 今天的日志
sudo journalctl -u modbus-rtu-manager --since today
```

### 3. 性能监控

安装监控工具：
```bash
sudo apt install htop iotop -y
```

## 九、常见问题

### Q1: 串口无法访问

**解决方案：**
```bash
# 检查串口设备
ls -l /dev/tty*

# 检查用户组
groups

# 如果没有 dialout 组，添加并重新登录
sudo usermod -a -G dialout $USER
```

### Q2: 内存不足

**解决方案：**
1. 使用 Lite 版本系统
2. 限制 Node.js 内存使用
3. 增加 swap 空间：
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# 修改 CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Q3: 服务启动失败

**检查步骤：**
```bash
# 查看详细错误
sudo journalctl -u modbus-rtu-manager -n 50

# 检查 Node.js
node --version

# 检查依赖
cd ~/modbus-rtu-manager
npm install

# 手动测试
node server.js
```

### Q4: 无法访问 Web 界面

**检查：**
```bash
# 检查服务状态
sudo systemctl status modbus-rtu-manager

# 检查端口
sudo netstat -tulpn | grep 3000

# 检查防火墙
sudo ufw status
```

### Q5: GPIO 串口不工作

**解决方案：**
1. 确认已启用 UART：`enable_uart=1`
2. 禁用串口控制台
3. 重启树莓派
4. 检查设备：`ls -l /dev/ttyAMA0`

## 十、推荐配置

### 树莓派 3B+
- 系统：Raspberry Pi OS Lite
- Node.js 内存限制：256MB
- 适合：小规模部署（1-5个设备）

### 树莓派 4B (2GB+)
- 系统：Raspberry Pi OS 或 Lite
- Node.js 内存限制：512MB
- 适合：中等规模部署（5-20个设备）

### 树莓派 5 (4GB+)
- 系统：Raspberry Pi OS
- Node.js 内存限制：1GB
- 适合：大规模部署（20+设备）

## 十一、安全建议

1. **修改默认密码**
```bash
passwd
```

2. **禁用 root 登录**
```bash
sudo nano /etc/ssh/sshd_config
# 设置: PermitRootLogin no
sudo systemctl restart ssh
```

3. **使用 SSH 密钥认证**

4. **定期更新系统**
```bash
sudo apt update && sudo apt upgrade -y
```

5. **配置防火墙**

6. **定期备份数据**

## 十二、技术支持

### 有用的命令

```bash
# 系统信息
cat /proc/cpuinfo
cat /proc/meminfo
vcgencmd measure_temp

# 网络信息
ifconfig
ip addr show

# 服务管理
sudo systemctl status modbus-rtu-manager
sudo journalctl -u modbus-rtu-manager -f

# 进程管理
ps aux | grep node
top
htop
```

### 日志位置

- 应用日志：`sudo journalctl -u modbus-rtu-manager`
- 系统日志：`/var/log/syslog`
- 启动日志：`dmesg`

---

**祝你在树莓派上部署成功！** 🍓🚀
