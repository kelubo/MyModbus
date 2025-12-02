# Prometheus 监控指南

## 功能概述

系统集成了 Prometheus 监控支持，可以导出详细的运行指标，用于监控、告警和可视化。

## 监控指标

### 设备指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `modbus_devices_total` | Gauge | 设备总数（按类型和状态） |
| `modbus_devices_online` | Gauge | 在线设备数 |
| `modbus_devices_offline` | Gauge | 离线设备数 |
| `modbus_data_collection_total` | Counter | 数据采集总次数 |
| `modbus_data_collection_duration_seconds` | Histogram | 数据采集耗时 |
| `modbus_data_collection_errors_total` | Counter | 数据采集错误总数 |
| `modbus_register_reads_total` | Counter | 寄存器读取总次数 |
| `modbus_register_writes_total` | Counter | 寄存器写入总次数 |

### 告警指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `modbus_active_alarms` | Gauge | 活动告警数（按级别） |
| `modbus_alarms_triggered_total` | Counter | 告警触发总次数 |

### 时间同步指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `modbus_time_sync_status` | Gauge | 时间同步状态（1=健康，0=异常） |
| `modbus_time_sync_total` | Counter | 时间同步总次数 |
| `modbus_time_sync_duration_milliseconds` | Histogram | 时间同步耗时 |
| `modbus_time_sync_offset_nanoseconds` | Gauge | PPS 时间偏移（纳秒） |

### NTP 服务器指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `modbus_ntp_server_status` | Gauge | NTP 服务器状态（1=运行，0=停止） |
| `modbus_ntp_server_requests_total` | Counter | NTP 请求总次数 |

### 集群指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `modbus_cluster_nodes` | Gauge | 集群节点数（按状态） |
| `modbus_cluster_tasks` | Gauge | 集群任务数（按节点） |

### HTTP 指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `modbus_http_requests_total` | Counter | HTTP 请求总次数 |
| `modbus_http_request_duration_seconds` | Histogram | HTTP 请求耗时 |
| `modbus_websocket_connections` | Gauge | WebSocket 连接数 |

### 数据库指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `modbus_database_queries_total` | Counter | 数据库查询总次数 |
| `modbus_database_query_duration_seconds` | Histogram | 数据库查询耗时 |

### 系统指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `modbus_rtu_process_cpu_seconds_total` | Counter | CPU 使用时间 |
| `modbus_rtu_process_resident_memory_bytes` | Gauge | 内存使用量 |
| `modbus_rtu_nodejs_heap_size_total_bytes` | Gauge | Node.js 堆内存总大小 |
| `modbus_rtu_nodejs_heap_size_used_bytes` | Gauge | Node.js 堆内存使用量 |

## 快速开始

### 1. 访问 Metrics 端点

系统启动后，可以直接访问 metrics 端点：

```bash
curl http://localhost:3000/metrics
```

输出示例：
```
# HELP modbus_devices_total Total number of Modbus devices
# TYPE modbus_devices_total gauge
modbus_devices_total{type="rtu",status="all"} 5
modbus_devices_total{type="tcp",status="all"} 3

# HELP modbus_devices_online Number of online Modbus devices
# TYPE modbus_devices_online gauge
modbus_devices_online 7

# HELP modbus_devices_offline Number of offline Modbus devices
# TYPE modbus_devices_offline gauge
modbus_devices_offline 1
```

### 2. 安装 Prometheus

**Docker 方式**：

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/prometheus_rules.yml:/etc/prometheus/prometheus_rules.yml \
  prom/prometheus
```

**传统安装**：

```bash
# 下载 Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz

# 解压
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# 复制配置文件
cp /path/to/modbus-rtu-manager/prometheus.yml ./
cp /path/to/modbus-rtu-manager/prometheus_rules.yml ./

# 启动
./prometheus --config.file=prometheus.yml
```

### 3. 配置 Prometheus

编辑 `prometheus.yml`：

```yaml
scrape_configs:
  - job_name: 'modbus-rtu-manager'
    scrape_interval: 10s
    static_configs:
      - targets: ['localhost:3000']
```

### 4. 访问 Prometheus UI

打开浏览器访问：http://localhost:9090

## 常用查询

### 设备监控

```promql
# 在线设备数
modbus_devices_online

# 离线设备数
modbus_devices_offline

# 设备在线率
modbus_devices_online / (modbus_devices_online + modbus_devices_offline) * 100

# 数据采集成功率
rate(modbus_data_collection_total{status="success"}[5m]) / rate(modbus_data_collection_total[5m]) * 100

# 数据采集错误率
rate(modbus_data_collection_errors_total[5m])

# 平均数据采集耗时
rate(modbus_data_collection_duration_seconds_sum[5m]) / rate(modbus_data_collection_duration_seconds_count[5m])
```

### 告警监控

```promql
# 活动告警总数
sum(modbus_active_alarms)

# 严重告警数
modbus_active_alarms{level="critical"}

# 告警触发率
rate(modbus_alarms_triggered_total[5m])
```

### 时间同步监控

```promql
# 时间同步状态
modbus_time_sync_status

# 时间同步成功率
rate(modbus_time_sync_total{status="success"}[10m]) / rate(modbus_time_sync_total[10m]) * 100

# 平均同步耗时
rate(modbus_time_sync_duration_milliseconds_sum[10m]) / rate(modbus_time_sync_duration_milliseconds_count[10m])

# PPS 偏移
modbus_time_sync_offset_nanoseconds
```

### 系统性能

```promql
# CPU 使用率
rate(modbus_rtu_process_cpu_seconds_total[5m]) * 100

# 内存使用量（MB）
modbus_rtu_process_resident_memory_bytes / 1024 / 1024

# HTTP 请求率
rate(modbus_http_requests_total[5m])

# HTTP P95 延迟
histogram_quantile(0.95, rate(modbus_http_request_duration_seconds_bucket[5m]))

# WebSocket 连接数
modbus_websocket_connections
```

## Grafana 可视化

### 1. 安装 Grafana

```bash
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

访问：http://localhost:3001（默认用户名/密码：admin/admin）

### 2. 添加 Prometheus 数据源

1. 登录 Grafana
2. 点击 Configuration → Data Sources
3. 点击 Add data source
4. 选择 Prometheus
5. 设置 URL：http://prometheus:9090
6. 点击 Save & Test

### 3. 导入仪表板

创建仪表板，添加以下面板：

**设备状态面板**：
- 在线设备数：`modbus_devices_online`
- 离线设备数：`modbus_devices_offline`
- 设备在线率：`modbus_devices_online / (modbus_devices_online + modbus_devices_offline) * 100`

**数据采集面板**：
- 采集成功率：`rate(modbus_data_collection_total{status="success"}[5m]) / rate(modbus_data_collection_total[5m]) * 100`
- 采集错误率：`rate(modbus_data_collection_errors_total[5m])`
- 平均耗时：`rate(modbus_data_collection_duration_seconds_sum[5m]) / rate(modbus_data_collection_duration_seconds_count[5m])`

**告警面板**：
- 活动告警：`sum(modbus_active_alarms)`
- 严重告警：`modbus_active_alarms{level="critical"}`
- 告警趋势：`rate(modbus_alarms_triggered_total[5m])`

**系统性能面板**：
- CPU 使用率：`rate(modbus_rtu_process_cpu_seconds_total[5m]) * 100`
- 内存使用：`modbus_rtu_process_resident_memory_bytes / 1024 / 1024`
- HTTP 请求率：`rate(modbus_http_requests_total[5m])`

## 告警配置

### Alertmanager 安装

```bash
docker run -d \
  --name alertmanager \
  -p 9093:9093 \
  -v $(pwd)/alertmanager.yml:/etc/alertmanager/alertmanager.yml \
  prom/alertmanager
```

### Alertmanager 配置

创建 `alertmanager.yml`：

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'admin@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'
```

## 最佳实践

### 1. 监控策略

- **设备监控**：关注设备在线率和数据采集成功率
- **性能监控**：监控 CPU、内存、HTTP 延迟
- **告警监控**：及时响应严重告警
- **时间同步**：确保时间同步状态健康

### 2. 告警规则

- 设置合理的告警阈值
- 使用 `for` 子句避免误报
- 按严重程度分级告警
- 配置告警通知渠道

### 3. 数据保留

```yaml
# prometheus.yml
global:
  # 数据保留时间
  storage.tsdb.retention.time: 15d
  # 数据保留大小
  storage.tsdb.retention.size: 10GB
```

### 4. 性能优化

- 调整抓取间隔（scrape_interval）
- 使用标签过滤减少数据量
- 定期清理旧数据
- 使用远程存储（长期保留）

## 故障排除

### 问题 1：无法访问 /metrics

**检查**：
```bash
curl http://localhost:3000/metrics
```

**解决**：
- 确认服务已启动
- 检查端口是否正确
- 查看服务器日志

### 问题 2：Prometheus 无法抓取数据

**检查**：
1. Prometheus UI → Status → Targets
2. 查看目标状态是否为 UP

**解决**：
- 检查网络连接
- 确认 prometheus.yml 配置正确
- 检查防火墙设置

### 问题 3：指标数据不更新

**检查**：
- 查看指标更新时间
- 检查数据采集是否正常

**解决**：
- 重启服务
- 检查数据库连接
- 查看应用日志

## 相关文档

- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)
- [PromQL 查询语言](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**版本**: v1.0.0  
**更新**: 2024-12-01
