# 安装说明

## 系统要求

- Node.js >= 14.0
- npm >= 6.0
- Windows 10/11 或 Linux 系统

## 快速安装

### 1. 安装依赖

```bash
npm install
```

### 2. 选择运行方式

#### 方式 A：开发模式（临时运行）

```bash
node server.js
```

访问：http://localhost:3000

#### 方式 B：系统服务（生产环境，开机自启）

**Windows:**
```bash
# 右键点击 install-service.bat
# 选择"以管理员身份运行"
```

**Linux:**
```bash
chmod +x install-service.sh
sudo bash install-service.sh
```

## 详细文档

- [快速开始](QUICK_START.md)
- [完整文档](README.md)
- [服务安装指南](SERVICE_GUIDE.md)

## 常见问题

### Windows 串口
- 串口格式：COM1, COM2, COM3...
- 检查设备管理器确认串口号

### Linux 串口
- 串口格式：/dev/ttyUSB0, /dev/ttyS0...
- 添加权限：`sudo usermod -a -G dialout $USER`

### 端口占用
- 默认端口：3000
- 修改端口：编辑 server.js 或设置环境变量

## 下一步

1. 打开浏览器访问 http://localhost:3000
2. 添加设备
3. 启动数据采集
4. 查看实时数据

祝使用愉快！
