# 项目结构迁移指南 (v1.x → v2.0)

## 📋 变更概述

v2.0 版本对项目结构进行了重大重构，将所有源代码文件移至 `src/` 目录，使项目结构更加清晰和专业。

## 🔄 主要变更

### 目录结构变更

```diff
项目根目录/
- server.js                    → src/server.js
- modbusManager.js             → src/modbusManager.js
- database.js                  → src/database.js
- alarm/                       → src/alarm/
- backup/                      → src/backup/
- cluster/                     → src/cluster/
- config/                      → src/config/
- database/                    → src/database/
- monitoring/                  → src/monitoring/
- time/                        → src/time/
- tools/                       → src/tools/
+ src/                         # 新增：源代码目录
  public/                      # 保持不变
  docs/                        # 保持不变
  scripts/                     # 保持不变
  backups/                     # 保持不变（运行时生成）
```

### 启动命令变更

#### 旧版本 (v1.x)
```bash
node server.js
```

#### 新版本 (v2.0)
```bash
npm start
# 或
node src/server.js
```

### 配置文件变更

#### package.json
```diff
{
-  "main": "server.js",
+  "main": "src/server.js",
   "scripts": {
-    "start": "node server.js",
+    "start": "node src/server.js",
-    "dev": "nodemon server.js",
+    "dev": "nodemon src/server.js"
   }
}
```

#### Dockerfile
```diff
- CMD ["node", "server.js"]
+ CMD ["node", "src/server.js"]
```

#### 系统服务脚本
- Windows: `scripts/windows/install-service.js`
- Linux: `scripts/linux/install-service.sh`
- 树莓派: `scripts/linux/install-raspberry-pi.sh`

所有服务脚本已自动更新为新路径。

## 🚀 迁移步骤

### 对于新部署

直接使用 v2.0 版本，无需任何迁移操作：

```bash
# 1. 克隆或更新代码
git pull origin main

# 2. 安装依赖
npm install

# 3. 启动服务
npm start
```

### 对于现有部署

#### 方式 1：全新安装（推荐）

1. **备份数据**
```bash
# 备份数据库
cp modbus.db modbus.db.backup

# 备份配置
cp .env .env.backup
```

2. **更新代码**
```bash
git pull origin main
```

3. **重新安装服务**

**Windows:**
```bash
# 卸载旧服务
scripts\windows\uninstall-service.bat

# 安装新服务
scripts\windows\install-service.bat
```

**Linux:**
```bash
# 卸载旧服务
sudo bash scripts/linux/uninstall-service.sh

# 安装新服务
sudo bash scripts/linux/install-service.sh
```

4. **恢复数据**
```bash
# 数据库文件会自动保留
# 如果需要，可以从备份恢复
```

#### 方式 2：手动迁移

如果您对代码进行了自定义修改：

1. **备份自定义代码**
```bash
# 备份您修改过的文件
cp server.js server.js.custom
cp modbusManager.js modbusManager.js.custom
# ... 其他修改的文件
```

2. **更新代码**
```bash
git pull origin main
```

3. **合并自定义修改**
```bash
# 将您的修改应用到新位置
# 例如：将 server.js.custom 的修改合并到 src/server.js
```

4. **更新引用路径**

如果您的自定义代码中有路径引用，需要更新：
```javascript
// 旧路径
require('./database')
require('./config/system.config')

// 新路径（如果在 src/ 目录外）
require('./src/database')
require('./src/config/system.config')
```

## ⚠️ 注意事项

### 1. 路径引用

如果您有自定义脚本或配置文件引用了源代码文件，需要更新路径：

```javascript
// 旧路径
const server = require('./server');

// 新路径
const server = require('./src/server');
```

### 2. 环境变量

环境变量配置保持不变，无需修改 `.env` 文件。

### 3. 数据库文件

数据库文件 `modbus.db` 保持在根目录，无需移动。

### 4. 备份文件

备份文件目录 `backups/` 保持在根目录，已添加到 `.gitignore`。

### 5. Docker 部署

Docker 部署无需特殊操作，Dockerfile 已自动更新：

```bash
# 重新构建镜像
docker-compose build

# 重启服务
docker-compose restart
```

### 6. 开发工具配置

如果您使用 IDE 的调试功能，需要更新启动配置：

**VS Code (.vscode/launch.json):**
```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动程序",
      "program": "${workspaceFolder}/src/server.js"
    }
  ]
}
```

## 🔍 验证迁移

迁移完成后，请验证以下功能：

### 1. 服务启动
```bash
node src/server.js
```

应该看到：
```
========================================
Modbus RTU Manager 服务器已启动
========================================
运行模式: 单机模式
数据库类型: SQLITE
访问地址: http://localhost:3000
========================================
```

### 2. Web 界面访问
打开浏览器访问 `http://localhost:3000`，确认界面正常显示。

### 3. 设备管理
- 添加设备
- 查看设备列表
- 编辑设备
- 删除设备

### 4. 数据采集
确认设备数据正常采集和显示。

### 5. 位置管理（新功能）
- 打开位置管理器
- 添加位置
- 为设备分配位置

## 🐛 故障排除

### 问题 1: 服务无法启动

**错误信息**: `Cannot find module './database'`

**解决方法**:
```bash
# 确认文件已正确移动到 src/ 目录
ls -la src/

# 如果文件缺失，重新拉取代码
git reset --hard
git pull origin main
```

### 问题 2: 静态文件无法访问

**错误信息**: 404 错误，无法加载 CSS/JS 文件

**解决方法**:
检查 `src/server.js` 中的静态文件路径配置：
```javascript
app.use(express.static(path.join(__dirname, '../public')));
```

### 问题 3: 系统服务无法启动

**Windows:**
```bash
# 查看服务日志
scripts\windows\logs-service.bat

# 重新安装服务
scripts\windows\uninstall-service.bat
scripts\windows\install-service.bat
```

**Linux:**
```bash
# 查看服务状态
sudo systemctl status modbus-rtu-manager

# 查看日志
sudo journalctl -u modbus-rtu-manager -f

# 重新安装服务
sudo bash scripts/linux/uninstall-service.sh
sudo bash scripts/linux/install-service.sh
```

### 问题 4: 数据库连接失败

**解决方法**:
```bash
# 检查数据库文件是否存在
ls -la modbus.db

# 如果不存在，从备份恢复
cp modbus.db.backup modbus.db

# 或者让系统自动创建新数据库
rm modbus.db
node src/server.js
```

## 📞 获取帮助

如果遇到迁移问题，请：

1. 查看完整文档: `docs/PROJECT_STRUCTURE_NEW.md`
2. 查看故障排除指南: `docs/TROUBLESHOOTING.md`
3. 提交 Issue 到 GitHub
4. 联系技术支持

## 📝 更新日志

### v2.0.0 (2024-12-02)

**重大变更**:
- ✅ 重构项目结构，代码移至 `src/` 目录
- ✅ 更新所有启动脚本和配置文件
- ✅ 优化根目录结构，更加清晰

**新功能**:
- ✅ 添加设备位置管理功能
- ✅ 优化前端界面布局
- ✅ 改进模态框滚动和响应式设计

**改进**:
- ✅ 更新文档结构
- ✅ 添加迁移指南
- ✅ 优化 .gitignore 配置

**兼容性**:
- ✅ 保持 API 接口不变
- ✅ 保持数据库结构不变
- ✅ 保持配置文件格式不变

---

**版本**: v2.0.0  
**更新日期**: 2024-12-02  
**向后兼容**: 数据和配置完全兼容 v1.x
