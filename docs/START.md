# 快速启动指南

## 第一步：确认Node.js安装

请在命令行中运行以下命令检查Node.js是否正确安装：

```bash
node --version
npm --version
```

### 如果显示"无法识别"或"找不到"

说明Node.js未正确安装或未添加到系统PATH。请按以下步骤操作：

#### 方法1：重新安装Node.js（推荐）

1. 访问 https://nodejs.org/
2. 下载LTS版本（长期支持版）
3. 运行安装程序
4. **重要：** 安装时确保勾选 "Add to PATH" 选项
5. 安装完成后，**重启命令行窗口**
6. 再次运行 `node --version` 验证

#### 方法2：手动添加到PATH

如果已经安装但未添加到PATH：

1. 找到Node.js安装目录（通常是 `C:\Program Files\nodejs\`）
2. 右键"此电脑" → 属性 → 高级系统设置 → 环境变量
3. 在"系统变量"中找到"Path"，点击编辑
4. 添加Node.js安装目录路径
5. 确定保存，**重启命令行窗口**

---

## 第二步：安装项目依赖

在项目目录下运行：

```bash
npm install
```

这将安装以下依赖：
- express - Web服务器框架
- ws - WebSocket实时通信
- sqlite3 - 数据库
- serialport - 串口通信
- modbus-serial - Modbus协议支持

---

## 第三步：启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

---

## 第四步：访问系统

打开浏览器访问：

```
http://localhost:3000
```

---

## 常见问题

### Q: npm install 失败怎么办？

**A:** 尝试以下方法：

1. 清除npm缓存：
```bash
npm cache clean --force
```

2. 使用国内镜像源：
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

3. 如果是权限问题，使用管理员权限运行命令行

### Q: 端口3000被占用怎么办？

**A:** 修改 `server.js` 中的端口号：
```javascript
const PORT = process.env.PORT || 3000;  // 改为其他端口，如 3001
```

### Q: 如何连接真实的Modbus设备？

**A:** 
1. 确保设备通过串口连接到电脑
2. 在Windows设备管理器中查看COM口号
3. 在系统中添加设备时填写正确的COM口和参数
4. 点击"启动采集"开始读取数据

### Q: 串口权限问题（Linux）

**A:** 
```bash
sudo usermod -a -G dialout $USER
# 然后重新登录
```

---

## 项目结构

```
modbus-rtu-manager/
├── server.js              # Express服务器主文件
├── database.js            # SQLite数据库操作
├── modbusManager.js       # Modbus通信管理
├── package.json           # 项目配置和依赖
├── public/               # 前端静态文件
│   ├── index.html        # 主页面
│   ├── app.js            # 前端JavaScript
│   └── style.css         # 样式文件
├── README.md             # 详细文档
└── START.md              # 本文件（快速启动）
```

---

## 下一步

1. ✅ 确认Node.js安装
2. ✅ 安装项目依赖
3. ✅ 启动服务器
4. 📝 添加Modbus设备
5. 🚀 开始数据采集
6. 📊 查看实时图表

详细使用说明请查看 `README.md`
