# Modbus RTU Manager 文档中心

欢迎使用 Modbus RTU Manager！这里是完整的文档索引。

## 🚀 快速开始

- [快速开始指南](QUICK_START.md) - 5分钟快速上手
- [安装指南](INSTALL.md) - 详细的安装步骤
- [项目结构](PROJECT_STRUCTURE_NEW.md) - 了解项目组织方式
- [迁移指南](MIGRATION_V2.md) - 从 v1.x 升级到 v2.0

## 📖 功能指南

### 核心功能
- [设备管理](guides/DEVICE_GUIDE.md) - 添加、配置和管理 Modbus 设备
- [位置管理](guides/LOCATION_GUIDE.md) - 组织和管理设备位置
- [数据监控](guides/MONITORING_GUIDE.md) - 实时数据采集和可视化
- [拓扑图](guides/TOPOLOGY_GUIDE.md) - 设备拓扑可视化

### 高级功能
- [告警管理](ALARM_GUIDE.md) - 配置告警规则和通知
- [备份恢复](BACKUP_GUIDE.md) - 数据备份和恢复
- [集群部署](CLUSTER_GUIDE.md) - 高可用集群配置
- [时间同步](TIME_SYNC_SUMMARY.md) - NTP 和 GPS 时间同步
- [Prometheus 监控](guides/PROMETHEUS_GUIDE.md) - 系统监控和告警

### 数据库
- [数据库配置](DATABASE_GUIDE.md) - 支持 SQLite、MySQL、PostgreSQL、Redis
- [数据库切换](guides/DATABASE_SWITCH.md) - 在不同数据库间切换

## 🔧 部署指南

### 基础部署
- [Windows 部署](guides/WINDOWS_DEPLOY.md) - Windows 系统部署
- [Linux 部署](guides/LINUX_DEPLOY.md) - Linux 系统部署
- [树莓派部署](RASPBERRY_PI_GUIDE.md) - 树莓派专用指南

### 容器化部署
- [Docker 部署](DOCKER_GUIDE.md) - 使用 Docker 快速部署
- [Docker Compose](guides/DOCKER_COMPOSE.md) - 多容器编排
- [Kubernetes 部署](guides/K8S_DEPLOY.md) - K8s 集群部署

### 系统服务
- [Windows 服务](SERVICE_GUIDE.md) - 安装为 Windows 系统服务
- [Linux 服务](guides/LINUX_SERVICE.md) - 安装为 systemd 服务
- [开机自启](guides/AUTO_START.md) - 配置开机自动启动

## 🛠️ 开发指南

### API 文档
- [REST API](guides/API_REST.md) - HTTP API 接口文档
- [WebSocket API](guides/API_WEBSOCKET.md) - 实时数据推送
- [Modbus API](guides/API_MODBUS.md) - Modbus 通信接口

### 扩展开发
- [插件开发](guides/PLUGIN_DEV.md) - 开发自定义插件
- [数据库适配器](guides/DB_ADAPTER.md) - 添加新的数据库支持
- [通知渠道](guides/NOTIFICATION_CHANNEL.md) - 添加新的通知方式

### 贡献指南
- [贡献指南](CONTRIBUTING.md) - 如何为项目做贡献
- [代码规范](guides/CODE_STYLE.md) - 代码风格指南
- [测试指南](guides/TESTING.md) - 编写和运行测试

## 📊 使用场景

- [工业自动化](guides/USE_CASE_INDUSTRIAL.md) - 工厂设备监控
- [智能建筑](guides/USE_CASE_BUILDING.md) - 楼宇自动化
- [能源管理](guides/USE_CASE_ENERGY.md) - 能源监测系统
- [数据中心](guides/USE_CASE_DATACENTER.md) - 机房设备管理

## 🔍 参考资料

### 技术参考
- [Modbus 协议](guides/MODBUS_PROTOCOL.md) - Modbus RTU/TCP 协议说明
- [串口通信](guides/SERIAL_COMM.md) - 串口配置和调试
- [网络配置](guides/NETWORK_CONFIG.md) - TCP/IP 网络配置

### 配置参考
- [环境变量](guides/ENV_VARS.md) - 所有环境变量说明
- [配置文件](guides/CONFIG_FILES.md) - 配置文件格式
- [命令行参数](guides/CLI_ARGS.md) - 启动参数说明

### 故障排除
- [常见问题](guides/FAQ.md) - 常见问题解答
- [故障排除](guides/TROUBLESHOOTING.md) - 问题诊断和解决
- [错误代码](guides/ERROR_CODES.md) - 错误代码对照表

## 📝 更新日志

- [更新日志](CHANGELOG.md) - 版本更新记录
- [发布说明](RELEASE_NOTES.md) - 最新版本说明
- [路线图](ROADMAP.md) - 未来开发计划

## 🌐 其他语言

- [English](README_EN.md) - English Documentation
- [中文](README_CN.md) - 中文文档

## 📞 获取帮助

### 社区支持
- GitHub Issues: 报告 Bug 和功能请求
- GitHub Discussions: 技术讨论和问答
- Wiki: 社区维护的文档和教程

### 商业支持
- 技术支持: support@example.com
- 商务合作: business@example.com
- 定制开发: custom@example.com

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户！

---

**文档版本**: v2.0.0  
**最后更新**: 2024-12-02  
**维护者**: Modbus RTU Manager Team

## 📚 文档导航

### 按角色分类

**系统管理员**
1. [安装指南](INSTALL.md)
2. [部署指南](DOCKER_GUIDE.md)
3. [备份恢复](BACKUP_GUIDE.md)
4. [系统监控](guides/PROMETHEUS_GUIDE.md)

**设备工程师**
1. [设备管理](guides/DEVICE_GUIDE.md)
2. [位置管理](guides/LOCATION_GUIDE.md)
3. [告警配置](ALARM_GUIDE.md)
4. [数据监控](guides/MONITORING_GUIDE.md)

**开发人员**
1. [项目结构](PROJECT_STRUCTURE_NEW.md)
2. [API 文档](guides/API_REST.md)
3. [开发指南](guides/PLUGIN_DEV.md)
4. [贡献指南](CONTRIBUTING.md)

### 按任务分类

**初次使用**
1. [快速开始](QUICK_START.md) → 
2. [添加设备](guides/DEVICE_GUIDE.md) → 
3. [查看数据](guides/MONITORING_GUIDE.md)

**生产部署**
1. [选择部署方式](INSTALL.md) → 
2. [配置数据库](DATABASE_GUIDE.md) → 
3. [配置告警](ALARM_GUIDE.md) → 
4. [设置备份](BACKUP_GUIDE.md)

**集群部署**
1. [集群规划](CLUSTER_GUIDE.md) → 
2. [节点部署](guides/CLUSTER_DEPLOY.md) → 
3. [负载均衡](guides/LOAD_BALANCE.md) → 
4. [监控告警](CLUSTER_MONITORING_GUIDE.md)

**问题解决**
1. [查看日志](guides/LOGS.md) → 
2. [诊断问题](guides/TROUBLESHOOTING.md) → 
3. [常见问题](guides/FAQ.md)

---

💡 **提示**: 使用浏览器的搜索功能 (Ctrl+F / Cmd+F) 快速查找相关文档。
