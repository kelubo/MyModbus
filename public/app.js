let devices = [];
let charts = {};
let ws = null;
let alarmRules = [];
let activeAlarms = [];

// WebSocket连接
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);
  
  ws.onopen = () => console.log('WebSocket已连接');
  ws.onclose = () => {
    console.log('WebSocket已断开，5秒后重连');
    setTimeout(connectWebSocket, 5000);
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'data') {
      updateChart(data);
    } else if (data.type === 'alarm') {
      handleAlarmMessage(data);
    }
  };
}

// 标签页切换
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'charts') {
      loadCharts();
    } else if (tabName === 'system') {
      loadSystemInfo();
    } else if (tabName === 'backup') {
      loadBackups();
    } else if (tabName === 'alarms') {
      loadAlarmData();
    } else if (tabName === 'topology') {
      loadTopology();
    }
  });
});

// 加载设备列表
async function loadDevices() {
  const response = await fetch('/api/devices');
  devices = await response.json();
  renderDeviceTable();
}

// 渲染设备表格
function renderDeviceTable() {
  const tbody = document.querySelector('#deviceTable tbody');
  tbody.innerHTML = devices.map(device => {
    const connectionType = device.connection_type === 'tcp' ? 'TCP' : 'RTU';
    const portOrIp = device.connection_type === 'tcp' ? device.ip_address : device.port;
    const baudrateOrPort = device.connection_type === 'tcp' ? device.tcp_port : device.baudrate;
    const locationName = getDeviceLocationName(device);
    
    return `
      <tr>
        <td>${device.id}</td>
        <td>${device.name}</td>
        <td>${connectionType}</td>
        <td>${device.slave_id}</td>
        <td>${portOrIp}</td>
        <td>${baudrateOrPort}</td>
        <td>${device.register_address}</td>
        <td>${device.register_count}</td>
        <td>${device.data_type}</td>
        <td>${device.interval}</td>
        <td>${locationName}</td>
        <td class="${device.enabled ? 'status-enabled' : 'status-disabled'}">
          ${device.enabled ? '启用' : '禁用'}
        </td>
        <td>
          <button class="btn btn-primary action-btn" onclick="editDevice(${device.id})">编辑</button>
          ${device.connection_type === 'tcp' ? `<button class="btn btn-info action-btn" onclick="showChangeClientIPModal(${device.id})">修改连接IP</button>` : ''}
          <button class="btn btn-warning action-btn" onclick="showSetIPModal(${device.id})">设置设备IP</button>
          <button class="btn btn-danger action-btn" onclick="deleteDevice(${device.id})">删除</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 连接类型切换
document.getElementById('connectionType').addEventListener('change', (e) => {
  const isTcp = e.target.value === 'tcp';
  document.getElementById('rtuFields').style.display = isTcp ? 'none' : 'block';
  document.getElementById('tcpFields').style.display = isTcp ? 'block' : 'none';
  
  // 更新必填项
  document.getElementById('port').required = !isTcp;
  document.getElementById('ipAddress').required = isTcp;
});

// 添加设备
document.getElementById('addDevice').addEventListener('click', () => {
  document.getElementById('modalTitle').textContent = '添加设备';
  document.getElementById('deviceForm').reset();
  document.getElementById('deviceId').value = '';
  document.getElementById('connectionType').value = 'rtu';
  document.getElementById('rtuFields').style.display = 'block';
  document.getElementById('tcpFields').style.display = 'none';
  document.getElementById('port').required = true;
  document.getElementById('ipAddress').required = false;
  document.getElementById('modal').style.display = 'block';
});

// 编辑设备
function editDevice(id) {
  const device = devices.find(d => d.id === id);
  if (!device) return;
  
  document.getElementById('modalTitle').textContent = '编辑设备';
  document.getElementById('deviceId').value = device.id;
  document.getElementById('deviceName').value = device.name;
  document.getElementById('connectionType').value = device.connection_type || 'rtu';
  document.getElementById('slaveId').value = device.slave_id;
  document.getElementById('port').value = device.port || '';
  document.getElementById('baudrate').value = device.baudrate || 9600;
  document.getElementById('ipAddress').value = device.ip_address || '';
  document.getElementById('tcpPort').value = device.tcp_port || 502;
  document.getElementById('registerAddress').value = device.register_address;
  document.getElementById('registerCount').value = device.register_count;
  document.getElementById('dataType').value = device.data_type;
  document.getElementById('interval').value = device.interval;
  document.getElementById('enabled').checked = device.enabled;
  
  // 显示对应的字段
  const isTcp = device.connection_type === 'tcp';
  document.getElementById('rtuFields').style.display = isTcp ? 'none' : 'block';
  document.getElementById('tcpFields').style.display = isTcp ? 'block' : 'none';
  document.getElementById('port').required = !isTcp;
  document.getElementById('ipAddress').required = isTcp;
  
  document.getElementById('modal').style.display = 'block';
}

// 删除设备
async function deleteDevice(id) {
  if (!confirm('确定要删除此设备吗？')) return;
  
  await fetch(`/api/devices/${id}`, { method: 'DELETE' });
  loadDevices();
}

// 保存设备
document.getElementById('deviceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const connectionType = document.getElementById('connectionType').value;
  
  const device = {
    name: document.getElementById('deviceName').value,
    connection_type: connectionType,
    slave_id: parseInt(document.getElementById('slaveId').value),
    port: connectionType === 'rtu' ? document.getElementById('port').value : '',
    baudrate: connectionType === 'rtu' ? parseInt(document.getElementById('baudrate').value) : 9600,
    ip_address: connectionType === 'tcp' ? document.getElementById('ipAddress').value : '',
    tcp_port: connectionType === 'tcp' ? parseInt(document.getElementById('tcpPort').value) : 502,
    register_address: parseInt(document.getElementById('registerAddress').value),
    register_count: parseInt(document.getElementById('registerCount').value),
    data_type: document.getElementById('dataType').value,
    interval: parseInt(document.getElementById('interval').value),
    enabled: document.getElementById('enabled').checked
  };
  
  const id = document.getElementById('deviceId').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/devices/${id}` : '/api/devices';
  
  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device)
  });
  
  document.getElementById('modal').style.display = 'none';
  loadDevices();
});

// 关闭模态框
document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

// 启动/停止采集
document.getElementById('startCollection').addEventListener('click', async () => {
  await fetch('/api/collection/start', { method: 'POST' });
  alert('数据采集已启动');
});

document.getElementById('stopCollection').addEventListener('click', async () => {
  await fetch('/api/collection/stop', { method: 'POST' });
  alert('数据采集已停止');
});

// 加载图表
async function loadCharts() {
  const container = document.getElementById('chartContainer');
  container.innerHTML = '';
  
  for (const device of devices) {
    if (!device.enabled) continue;
    
    const response = await fetch(`/api/data/${device.id}?limit=50`);
    const data = await response.json();
    
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = `
      <h3>${device.name}</h3>
      <div class="realtime-value" id="value-${device.id}">--</div>
      <div class="timestamp" id="time-${device.id}">等待数据...</div>
      <canvas id="chart-${device.id}"></canvas>
    `;
    container.appendChild(card);
    
    createChart(device.id, data);
  }
}

// 创建图表
function createChart(deviceId, data) {
  const canvas = document.getElementById(`chart-${deviceId}`);
  const ctx = canvas.getContext('2d');
  
  const chartData = data.reverse().map(d => ({
    x: new Date(d.timestamp),
    y: d.value
  }));
  
  charts[deviceId] = {
    canvas,
    ctx,
    data: chartData,
    maxPoints: 50
  };
  
  drawChart(deviceId);
}

// 绘制图表
function drawChart(deviceId) {
  const chart = charts[deviceId];
  if (!chart) return;
  
  const { canvas, ctx, data } = chart;
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;
  
  ctx.clearRect(0, 0, width, height);
  
  if (data.length === 0) return;
  
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const values = data.map(d => d.y);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  
  // 绘制网格
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  
  // 绘制Y轴标签
  ctx.fillStyle = '#666';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const value = maxValue - (range / 5) * i;
    const y = padding + (chartHeight / 5) * i;
    ctx.fillText(value.toFixed(1), padding - 10, y + 4);
  }
  
  // 绘制折线
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  data.forEach((point, index) => {
    const x = padding + (chartWidth / (data.length - 1)) * index;
    const y = padding + chartHeight - ((point.y - minValue) / range) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // 绘制数据点
  ctx.fillStyle = '#3498db';
  data.forEach((point, index) => {
    const x = padding + (chartWidth / (data.length - 1)) * index;
    const y = padding + chartHeight - ((point.y - minValue) / range) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 更新图表
function updateChart(data) {
  const { deviceId, deviceName, value, timestamp } = data;
  
  // 更新实时值显示
  const valueEl = document.getElementById(`value-${deviceId}`);
  const timeEl = document.getElementById(`time-${deviceId}`);
  if (valueEl) {
    valueEl.textContent = value.toFixed(2);
    timeEl.textContent = new Date(timestamp).toLocaleString('zh-CN');
  }
  
  // 更新图表数据
  if (charts[deviceId]) {
    charts[deviceId].data.push({ x: new Date(timestamp), y: value });
    if (charts[deviceId].data.length > charts[deviceId].maxPoints) {
      charts[deviceId].data.shift();
    }
    drawChart(deviceId);
  }
}

// 显示设置IP模态框
function showSetIPModal(id) {
  const device = devices.find(d => d.id === id);
  if (!device) return;
  
  document.getElementById('setIPDeviceId').value = device.id;
  document.getElementById('setIPDeviceName').textContent = device.name;
  document.getElementById('newDeviceIP').value = '';
  document.getElementById('ipRegisterAddress').value = '0';
  document.getElementById('setIPModal').style.display = 'block';
}

// 设置设备IP地址
document.getElementById('setIPForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const deviceId = document.getElementById('setIPDeviceId').value;
  const newIP = document.getElementById('newDeviceIP').value;
  const ipRegisterAddress = parseInt(document.getElementById('ipRegisterAddress').value);
  
  try {
    const response = await fetch(`/api/devices/${deviceId}/set-ip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newIP, ipRegisterAddress })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      document.getElementById('setIPModal').style.display = 'none';
    } else {
      alert('设置失败: ' + result.error);
    }
  } catch (error) {
    alert('设置失败: ' + error.message);
  }
});

// 关闭设置IP模态框
document.querySelector('#setIPModal .close').addEventListener('click', () => {
  document.getElementById('setIPModal').style.display = 'none';
});

document.getElementById('cancelSetIPBtn').addEventListener('click', () => {
  document.getElementById('setIPModal').style.display = 'none';
});

// 显示修改Client端IP模态框
function showChangeClientIPModal(id) {
  const device = devices.find(d => d.id === id);
  if (!device) return;
  
  document.getElementById('changeClientIPDeviceId').value = device.id;
  document.getElementById('changeClientIPDeviceName').textContent = device.name;
  document.getElementById('currentClientIP').textContent = `${device.ip_address}:${device.tcp_port}`;
  document.getElementById('newClientIP').value = device.ip_address || '';
  document.getElementById('newClientPort').value = device.tcp_port || 502;
  document.getElementById('changeClientIPModal').style.display = 'block';
}

// 修改Client端IP地址
document.getElementById('changeClientIPForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const deviceId = document.getElementById('changeClientIPDeviceId').value;
  const newClientIP = document.getElementById('newClientIP').value;
  const newClientPort = parseInt(document.getElementById('newClientPort').value);
  
  const device = devices.find(d => d.id == deviceId);
  if (!device) return;
  
  // 更新设备配置
  device.ip_address = newClientIP;
  device.tcp_port = newClientPort;
  
  try {
    const response = await fetch(`/api/devices/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Client端连接IP已更新，请重新启动数据采集以应用更改');
      document.getElementById('changeClientIPModal').style.display = 'none';
      loadDevices();
    } else {
      alert('更新失败: ' + result.error);
    }
  } catch (error) {
    alert('更新失败: ' + error.message);
  }
});

// 关闭修改Client端IP模态框
document.querySelector('#changeClientIPModal .close').addEventListener('click', () => {
  document.getElementById('changeClientIPModal').style.display = 'none';
});

document.getElementById('cancelChangeClientIPBtn').addEventListener('click', () => {
  document.getElementById('changeClientIPModal').style.display = 'none';
});

// 加载系统信息
async function loadSystemInfo() {
  try {
    // 加载集群状态
    await loadClusterInfo();
    
    const response = await fetch('/api/system/info');
    const data = await response.json();
    
    // CPU信息
    document.getElementById('cpuUsage').textContent = `${data.cpu.usage}%`;
    document.getElementById('cpuCores').textContent = `${data.cpu.cores} 核心`;
    
    // 内存信息
    document.getElementById('memUsage').textContent = `${data.memory.usage}%`;
    document.getElementById('memDetail').textContent = `已使用: ${data.memory.used}GB / 总计: ${data.memory.total}GB`;
    
    // 操作系统信息
    document.getElementById('osInfo').innerHTML = `
      <div><strong>系统:</strong> ${data.os.distro}</div>
      <div><strong>版本:</strong> ${data.os.release}</div>
      <div><strong>架构:</strong> ${data.os.arch}</div>
      <div><strong>主机名:</strong> ${data.os.hostname}</div>
    `;
    
    // 磁盘信息
    const diskTbody = document.querySelector('#diskTable tbody');
    diskTbody.innerHTML = data.disk.map(disk => `
      <tr>
        <td>${disk.fs}</td>
        <td>${disk.type}</td>
        <td>${disk.size}</td>
        <td>${disk.used}</td>
        <td>${disk.available}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="flex: 1; background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
              <div style="width: ${disk.usage}%; height: 100%; background: ${disk.usage > 80 ? '#e74c3c' : disk.usage > 60 ? '#f39c12' : '#27ae60'};"></div>
            </div>
            <span>${disk.usage}%</span>
          </div>
        </td>
      </tr>
    `).join('');
    
    // 网络接口信息
    const networkTbody = document.querySelector('#networkTable tbody');
    networkTbody.innerHTML = data.network.map(iface => `
      <tr>
        <td>${iface.iface}</td>
        <td>${iface.ip4 || '-'}</td>
        <td>${iface.ip6 || '-'}</td>
        <td>${iface.mac || '-'}</td>
        <td>${iface.speed || '-'}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('加载系统信息失败:', error);
    alert('加载系统信息失败: ' + error.message);
  }
}

// 刷新系统信息
document.getElementById('refreshSystem').addEventListener('click', () => {
  loadSystemInfo();
});

// 备份管理
async function loadBackups() {
  try {
    const response = await fetch('/api/backup/list');
    const backups = await response.json();
    
    const tbody = document.querySelector('#backupTable tbody');
    
    if (backups.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
            暂无备份，点击"创建备份"按钮创建第一个备份
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = backups.map(backup => {
      const size = (backup.size / 1024).toFixed(2);
      const date = new Date(backup.created).toLocaleString('zh-CN');
      
      return `
        <tr>
          <td>${backup.name}</td>
          <td>${size} KB</td>
          <td>${date}</td>
          <td>
            <button class="btn btn-primary action-btn" onclick="downloadBackup('${backup.name}')">下载</button>
            <button class="btn btn-warning action-btn" onclick="restoreBackup('${backup.name}')">还原</button>
            <button class="btn btn-danger action-btn" onclick="deleteBackup('${backup.name}')">删除</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('加载备份列表失败:', error);
    showBackupStatus('加载备份列表失败: ' + error.message, 'error');
  }
}

function showBackupStatus(message, type = 'info') {
  const statusEl = document.getElementById('backupStatus');
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  statusEl.style.background = type === 'error' ? '#ffebee' : type === 'success' ? '#e8f5e9' : '#f5f5f5';
  statusEl.style.color = type === 'error' ? '#c62828' : type === 'success' ? '#2e7d32' : '#333';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

async function createBackup() {
  if (!confirm('确定要创建备份吗？')) return;
  
  showBackupStatus('正在创建备份，请稍候...', 'info');
  
  try {
    const response = await fetch('/api/backup/create', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showBackupStatus('备份创建成功！', 'success');
      loadBackups();
    } else {
      showBackupStatus('备份创建失败: ' + result.error, 'error');
    }
  } catch (error) {
    showBackupStatus('备份创建失败: ' + error.message, 'error');
  }
}

function downloadBackup(backupName) {
  window.location.href = `/api/backup/download/${backupName}`;
  showBackupStatus('正在下载备份...', 'info');
}

async function restoreBackup(backupName) {
  if (!confirm(`确定要还原备份 "${backupName}" 吗？\n\n警告：此操作将覆盖当前数据！\n还原前会自动备份当前数据。\n还原后建议重启服务。`)) {
    return;
  }
  
  showBackupStatus('正在还原备份，请稍候...', 'info');
  
  try {
    const response = await fetch(`/api/backup/restore/${backupName}`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showBackupStatus('备份还原成功！建议重启服务以应用更改。', 'success');
      setTimeout(() => {
        if (confirm('备份已还原，是否刷新页面？')) {
          location.reload();
        }
      }, 2000);
    } else {
      showBackupStatus('备份还原失败: ' + result.error, 'error');
    }
  } catch (error) {
    showBackupStatus('备份还原失败: ' + error.message, 'error');
  }
}

async function deleteBackup(backupName) {
  if (!confirm(`确定要删除备份 "${backupName}" 吗？\n\n此操作不可恢复！`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/backup/${backupName}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showBackupStatus('备份已删除', 'success');
      loadBackups();
    } else {
      showBackupStatus('删除失败: ' + result.error, 'error');
    }
  } catch (error) {
    showBackupStatus('删除失败: ' + error.message, 'error');
  }
}

// 备份按钮事件
document.getElementById('createBackup').addEventListener('click', createBackup);
document.getElementById('refreshBackups').addEventListener('click', loadBackups);

// 初始化
connectWebSocket();
loadDevices();
loadSystemSettings();

// ==================== 告警管理功能 ====================

// 处理告警消息
function handleAlarmMessage(data) {
  if (data.action === 'triggered') {
    showAlarmNotification(data.alarm);
    loadActiveAlarms();
    loadAlarmStats();
  } else if (data.action === 'recovered') {
    showAlarmRecoveryNotification(data.alarm);
    loadActiveAlarms();
    loadAlarmStats();
  }
}

// 显示告警通知
function showAlarmNotification(alarm) {
  const notification = document.createElement('div');
  notification.className = `alarm-notification alarm-${alarm.level}`;
  notification.innerHTML = `
    <div class="alarm-notification-header">
      <strong>🚨 ${getLevelText(alarm.level)}告警</strong>
      <button onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="alarm-notification-body">
      <div>${alarm.message}</div>
      <div style="font-size: 12px; color: #666; margin-top: 5px;">
        ${new Date(alarm.triggeredAt).toLocaleString('zh-CN')}
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // 5秒后自动消失
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// 显示告警恢复通知
function showAlarmRecoveryNotification(alarm) {
  const notification = document.createElement('div');
  notification.className = 'alarm-notification alarm-recovery';
  notification.innerHTML = `
    <div class="alarm-notification-header">
      <strong>✅ 告警恢复</strong>
      <button onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="alarm-notification-body">
      <div>${alarm.message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 加载告警数据
async function loadAlarmData() {
  await Promise.all([
    loadAlarmRules(),
    loadActiveAlarms(),
    loadAlarmHistory(),
    loadAlarmStats()
  ]);
}

// 加载告警规则
async function loadAlarmRules() {
  try {
    const response = await fetch('/api/alarms/rules');
    alarmRules = await response.json();
    renderAlarmRuleTable();
  } catch (error) {
    console.error('加载告警规则失败:', error);
  }
}

// 渲染告警规则表格
function renderAlarmRuleTable() {
  const tbody = document.querySelector('#alarmRuleTable tbody');
  
  if (alarmRules.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 20px; color: #999;">
          暂无告警规则，点击"添加规则"按钮创建第一条规则
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = alarmRules.map(rule => {
    const device = devices.find(d => d.id === rule.device_id);
    const deviceName = device ? device.name : `设备ID: ${rule.device_id}`;
    const conditionText = getConditionText(rule.condition);
    const levelBadge = `<span class="level-badge level-${rule.level}">${getLevelText(rule.level)}</span>`;
    
    return `
      <tr>
        <td>${rule.name}</td>
        <td>${deviceName}</td>
        <td>${conditionText}</td>
        <td>${rule.threshold}</td>
        <td>${levelBadge}</td>
        <td class="${rule.enabled ? 'status-enabled' : 'status-disabled'}">
          ${rule.enabled ? '启用' : '禁用'}
        </td>
        <td>
          <button class="btn btn-primary action-btn" onclick="editAlarmRule(${rule.id})">编辑</button>
          <button class="btn btn-danger action-btn" onclick="deleteAlarmRule(${rule.id})">删除</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 加载活动告警
async function loadActiveAlarms() {
  try {
    const response = await fetch('/api/alarms/active');
    activeAlarms = await response.json();
    renderActiveAlarms();
  } catch (error) {
    console.error('加载活动告警失败:', error);
  }
}

// 渲染活动告警
function renderActiveAlarms() {
  const container = document.getElementById('activeAlarmsList');
  
  if (activeAlarms.length === 0) {
    container.innerHTML = '<div class="no-alarms">✅ 当前没有活动告警</div>';
    return;
  }
  
  container.innerHTML = activeAlarms.map(alarm => `
    <div class="alarm-item alarm-${alarm.level} ${alarm.acknowledged ? 'acknowledged' : ''}">
      <div class="alarm-header">
        <span class="level-badge level-${alarm.level}">${getLevelText(alarm.level)}</span>
        <span class="alarm-device">${alarm.deviceName}</span>
        <span class="alarm-time">${new Date(alarm.triggeredAt).toLocaleString('zh-CN')}</span>
      </div>
      <div class="alarm-message">${alarm.message}</div>
      <div class="alarm-actions">
        ${!alarm.acknowledged ? `
          <button class="btn btn-sm btn-primary" onclick="acknowledgeAlarm(${alarm.deviceId}, ${alarm.ruleId})">
            确认
          </button>
        ` : '<span class="acknowledged-badge">已确认</span>'}
      </div>
    </div>
  `).join('');
}

// 加载告警历史
async function loadAlarmHistory() {
  try {
    const response = await fetch('/api/alarms/history?limit=50');
    const history = await response.json();
    renderAlarmHistory(history);
  } catch (error) {
    console.error('加载告警历史失败:', error);
  }
}

// 渲染告警历史
function renderAlarmHistory(history) {
  const container = document.getElementById('alarmHistoryList');
  
  if (history.length === 0) {
    container.innerHTML = '<div class="no-alarms">暂无告警历史</div>';
    return;
  }
  
  container.innerHTML = history.map(alarm => `
    <div class="alarm-item alarm-${alarm.level} alarm-history">
      <div class="alarm-header">
        <span class="level-badge level-${alarm.level}">${getLevelText(alarm.level)}</span>
        <span class="alarm-device">${alarm.deviceName}</span>
        <span class="alarm-time">${new Date(alarm.triggeredAt).toLocaleString('zh-CN')}</span>
      </div>
      <div class="alarm-message">${alarm.message}</div>
      ${alarm.recovered ? `
        <div class="alarm-recovered">
          ✅ 已恢复 - ${new Date(alarm.recoveredAt).toLocaleString('zh-CN')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// 加载告警统计
async function loadAlarmStats() {
  try {
    const response = await fetch('/api/alarms/stats');
    const stats = await response.json();
    
    document.getElementById('criticalCount').textContent = stats.critical;
    document.getElementById('warningCount').textContent = stats.warning;
    document.getElementById('infoCount').textContent = stats.info;
    document.getElementById('totalAlarmCount').textContent = stats.total;
  } catch (error) {
    console.error('加载告警统计失败:', error);
  }
}

// 确认告警
async function acknowledgeAlarm(deviceId, ruleId) {
  try {
    await fetch(`/api/alarms/acknowledge/${deviceId}/${ruleId}`, {
      method: 'POST'
    });
    loadActiveAlarms();
  } catch (error) {
    alert('确认告警失败: ' + error.message);
  }
}

// 清除所有告警
async function clearAllAlarms() {
  if (!confirm('确定要清除所有活动告警吗？')) return;
  
  try {
    await fetch('/api/alarms/clear', { method: 'POST' });
    loadActiveAlarms();
    loadAlarmStats();
  } catch (error) {
    alert('清除告警失败: ' + error.message);
  }
}

// 添加告警规则
document.getElementById('addAlarmRule').addEventListener('click', () => {
  document.getElementById('alarmRuleModalTitle').textContent = '添加告警规则';
  document.getElementById('alarmRuleForm').reset();
  document.getElementById('alarmRuleId').value = '';
  
  // 填充设备选项
  const deviceSelect = document.getElementById('alarmDeviceId');
  deviceSelect.innerHTML = '<option value="">请选择设备</option>' + 
    devices.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  
  document.getElementById('alarmRuleModal').style.display = 'block';
});

// 编辑告警规则
function editAlarmRule(id) {
  const rule = alarmRules.find(r => r.id === id);
  if (!rule) return;
  
  document.getElementById('alarmRuleModalTitle').textContent = '编辑告警规则';
  document.getElementById('alarmRuleId').value = rule.id;
  document.getElementById('alarmRuleName').value = rule.name;
  document.getElementById('alarmCondition').value = rule.condition;
  document.getElementById('alarmThreshold').value = rule.threshold;
  document.getElementById('alarmLevel').value = rule.level;
  document.getElementById('alarmEnabled').checked = rule.enabled;
  
  // 通知设置
  document.getElementById('notificationEmail').value = rule.notification_email || '';
  document.getElementById('notificationSMS').value = rule.notification_sms || '';
  document.getElementById('notificationWecom').checked = rule.notification_wecom === 1;
  document.getElementById('notificationDingtalk').checked = rule.notification_dingtalk === 1;
  
  // 填充设备选项
  const deviceSelect = document.getElementById('alarmDeviceId');
  deviceSelect.innerHTML = '<option value="">请选择设备</option>' + 
    devices.map(d => `<option value="${d.id}" ${d.id === rule.device_id ? 'selected' : ''}>${d.name}</option>`).join('');
  
  document.getElementById('alarmRuleModal').style.display = 'block';
}

// 删除告警规则
async function deleteAlarmRule(id) {
  if (!confirm('确定要删除此告警规则吗？')) return;
  
  try {
    await fetch(`/api/alarms/rules/${id}`, { method: 'DELETE' });
    loadAlarmRules();
  } catch (error) {
    alert('删除失败: ' + error.message);
  }
}

// 保存告警规则
document.getElementById('alarmRuleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const rule = {
    name: document.getElementById('alarmRuleName').value,
    device_id: parseInt(document.getElementById('alarmDeviceId').value),
    condition: document.getElementById('alarmCondition').value,
    threshold: parseFloat(document.getElementById('alarmThreshold').value),
    level: document.getElementById('alarmLevel').value,
    enabled: document.getElementById('alarmEnabled').checked,
    notification_email: document.getElementById('notificationEmail').value || null,
    notification_sms: document.getElementById('notificationSMS').value || null,
    notification_wecom: document.getElementById('notificationWecom').checked ? 1 : 0,
    notification_dingtalk: document.getElementById('notificationDingtalk').checked ? 1 : 0
  };
  
  const id = document.getElementById('alarmRuleId').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/alarms/rules/${id}` : '/api/alarms/rules';
  
  try {
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    
    document.getElementById('alarmRuleModal').style.display = 'none';
    loadAlarmRules();
  } catch (error) {
    alert('保存失败: ' + error.message);
  }
});

// 关闭告警规则模态框
document.querySelector('#alarmRuleModal .close').addEventListener('click', () => {
  document.getElementById('alarmRuleModal').style.display = 'none';
});

document.getElementById('cancelAlarmRuleBtn').addEventListener('click', () => {
  document.getElementById('alarmRuleModal').style.display = 'none';
});

// 清除所有告警按钮
document.getElementById('clearAllAlarms').addEventListener('click', clearAllAlarms);

// 刷新告警历史按钮
document.getElementById('refreshAlarmHistory').addEventListener('click', loadAlarmHistory);

// 辅助函数
function getConditionText(condition) {
  const map = {
    'gt': '大于 (>)',
    'gte': '大于等于 (>=)',
    'lt': '小于 (<)',
    'lte': '小于等于 (<=)',
    'eq': '等于 (=)',
    'ne': '不等于 (≠)'
  };
  return map[condition] || condition;
}

function getLevelText(level) {
  const map = {
    'critical': '严重',
    'warning': '警告',
    'info': '信息'
  };
  return map[level] || level;
}

// ==================== 通知配置管理 ====================

let notificationConfig = {};

// 打开通知设置
document.getElementById('notificationSettings').addEventListener('click', async () => {
  await loadNotificationConfig();
  document.getElementById('notificationModal').style.display = 'block';
});

// 关闭通知设置模态框
document.querySelector('#notificationModal .close').addEventListener('click', () => {
  document.getElementById('notificationModal').style.display = 'none';
});

// 通知配置标签页切换
document.querySelectorAll('.notification-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    document.querySelectorAll('.notification-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.notification-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${tabName}Config`).classList.add('active');
  });
});

// 加载通知配置
async function loadNotificationConfig() {
  try {
    const response = await fetch('/api/notifications/config');
    notificationConfig = await response.json();
    
    // 填充邮件配置
    if (notificationConfig.email) {
      document.getElementById('emailEnabled').checked = notificationConfig.email.enabled || false;
      document.getElementById('emailHost').value = notificationConfig.email.host || '';
      document.getElementById('emailPort').value = notificationConfig.email.port || 587;
      document.getElementById('emailSecure').checked = notificationConfig.email.secure || false;
      document.getElementById('emailFrom').value = notificationConfig.email.from || '';
      document.getElementById('emailUser').value = notificationConfig.email.user || '';
      document.getElementById('emailPassword').value = notificationConfig.email.password || '';
    }
    
    // 填充短信配置
    if (notificationConfig.sms) {
      document.getElementById('smsEnabled').checked = notificationConfig.sms.enabled || false;
      document.getElementById('smsApiUrl').value = notificationConfig.sms.apiUrl || '';
      document.getElementById('smsApiKey').value = notificationConfig.sms.apiKey || '';
      document.getElementById('smsSignName').value = notificationConfig.sms.signName || '';
      document.getElementById('smsTemplateCode').value = notificationConfig.sms.templateCode || '';
    }
    
    // 填充企业微信配置
    if (notificationConfig.wecom) {
      document.getElementById('wecomEnabled').checked = notificationConfig.wecom.enabled || false;
      document.getElementById('wecomWebhook').value = notificationConfig.wecom.webhookUrl || '';
    }
    
    // 填充钉钉配置
    if (notificationConfig.dingtalk) {
      document.getElementById('dingtalkEnabled').checked = notificationConfig.dingtalk.enabled || false;
      document.getElementById('dingtalkWebhook').value = notificationConfig.dingtalk.webhookUrl || '';
    }
  } catch (error) {
    console.error('加载通知配置失败:', error);
  }
}

// 保存邮件配置
document.getElementById('emailConfigForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const config = {
    enabled: document.getElementById('emailEnabled').checked,
    host: document.getElementById('emailHost').value,
    port: parseInt(document.getElementById('emailPort').value),
    secure: document.getElementById('emailSecure').checked,
    from: document.getElementById('emailFrom').value,
    user: document.getElementById('emailUser').value,
    password: document.getElementById('emailPassword').value
  };
  
  await saveNotificationConfig('email', config);
});

// 保存短信配置
document.getElementById('smsConfigForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const config = {
    enabled: document.getElementById('smsEnabled').checked,
    apiUrl: document.getElementById('smsApiUrl').value,
    apiKey: document.getElementById('smsApiKey').value,
    signName: document.getElementById('smsSignName').value,
    templateCode: document.getElementById('smsTemplateCode').value
  };
  
  await saveNotificationConfig('sms', config);
});

// 保存企业微信配置
document.getElementById('wecomConfigForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const config = {
    enabled: document.getElementById('wecomEnabled').checked,
    webhookUrl: document.getElementById('wecomWebhook').value
  };
  
  await saveNotificationConfig('wecom', config);
});

// 保存钉钉配置
document.getElementById('dingtalkConfigForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const config = {
    enabled: document.getElementById('dingtalkEnabled').checked,
    webhookUrl: document.getElementById('dingtalkWebhook').value
  };
  
  await saveNotificationConfig('dingtalk', config);
});

// 保存通知配置
async function saveNotificationConfig(type, config) {
  try {
    const response = await fetch(`/api/notifications/config/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (response.ok) {
      alert('配置已保存');
    } else {
      const error = await response.json();
      alert('保存失败: ' + error.error);
    }
  } catch (error) {
    alert('保存失败: ' + error.message);
  }
}

// 测试通知
async function testNotification(type) {
  let testRecipients = null;
  
  if (type === 'email') {
    testRecipients = prompt('请输入测试邮箱地址（多个用逗号分隔）:');
    if (!testRecipients) return;
    testRecipients = testRecipients.split(',').map(e => e.trim());
  } else if (type === 'sms') {
    testRecipients = prompt('请输入测试手机号（多个用逗号分隔）:');
    if (!testRecipients) return;
    testRecipients = testRecipients.split(',').map(p => p.trim());
  }
  
  try {
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, testRecipients })
    });
    
    if (response.ok) {
      alert('测试通知已发送，请检查接收情况');
    } else {
      const error = await response.json();
      alert('发送失败: ' + error.error);
    }
  } catch (error) {
    alert('发送失败: ' + error.message);
  }
}

// ==================== 集群监控功能 ====================

// 加载集群信息
async function loadClusterInfo() {
  try {
    const response = await fetch('/api/cluster/status');
    const clusterData = await response.json();
    
    if (clusterData.mode === 'cluster') {
      // 显示集群区域
      document.getElementById('clusterSection').style.display = 'block';
      
      // 更新集群统计
      document.getElementById('clusterMode').textContent = '集群模式';
      document.getElementById('clusterNodes').textContent = clusterData.nodes;
      document.getElementById('currentNode').textContent = clusterData.currentNode;
      document.getElementById('totalTasks').textContent = clusterData.totalTasks || 0;
      
      // 加载节点列表
      await loadClusterNodes();
      
      // 显示任务分配
      renderTaskDistribution(clusterData.taskDistribution || {});
    } else {
      // 隐藏集群区域
      document.getElementById('clusterSection').style.display = 'none';
    }
  } catch (error) {
    console.error('加载集群信息失败:', error);
    document.getElementById('clusterSection').style.display = 'none';
  }
}

// 加载集群节点列表
async function loadClusterNodes() {
  try {
    const response = await fetch('/api/cluster/nodes');
    const nodes = await response.json();
    
    const tbody = document.querySelector('#clusterNodesTable tbody');
    
    if (nodes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 20px; color: #999;">
            暂无活动节点
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = nodes.map(node => {
      const memoryGB = (node.memory / 1024 / 1024 / 1024).toFixed(2);
      const freeMemGB = (node.freeMem / 1024 / 1024 / 1024).toFixed(2);
      const load = node.load ? node.load.toFixed(2) : '--';
      const uptime = node.uptime ? formatUptime(node.uptime) : '--';
      const lastHeartbeat = formatTimestamp(node.lastHeartbeat);
      const isHealthy = (Date.now() - node.lastHeartbeat) < 30000;
      
      const roleText = {
        'master': '主节点',
        'worker': '工作节点',
        'both': '混合节点'
      }[node.role] || node.role;
      
      const roleBadge = `<span class="role-badge role-${node.role}">${roleText}</span>`;
      const statusBadge = isHealthy 
        ? '<span class="status-badge status-healthy">健康</span>'
        : '<span class="status-badge status-unhealthy">异常</span>';
      
      return `
        <tr class="${isHealthy ? '' : 'node-unhealthy'}">
          <td><strong>${node.id}</strong></td>
          <td>${roleBadge}</td>
          <td>${node.hostname || '--'}</td>
          <td>${node.cpus || '--'}</td>
          <td>${memoryGB} (可用: ${freeMemGB})</td>
          <td>${load}</td>
          <td>${uptime}</td>
          <td>${lastHeartbeat}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('加载节点列表失败:', error);
  }
}

// 渲染任务分配
function renderTaskDistribution(distribution) {
  const container = document.getElementById('taskDistribution');
  
  if (Object.keys(distribution).length === 0) {
    container.innerHTML = '<div class="no-tasks">暂无任务分配</div>';
    return;
  }
  
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  
  container.innerHTML = Object.entries(distribution).map(([nodeId, count]) => {
    const percentage = ((count / total) * 100).toFixed(1);
    
    return `
      <div class="task-item">
        <div class="task-node">
          <strong>${nodeId}</strong>
          <span class="task-count">${count} 个任务</span>
        </div>
        <div class="task-bar-container">
          <div class="task-bar" style="width: ${percentage}%"></div>
        </div>
        <div class="task-percentage">${percentage}%</div>
      </div>
    `;
  }).join('');
}

// 格式化运行时间
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}天 ${hours}小时`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
}

// 格式化时间戳
function formatTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return new Date(timestamp).toLocaleString('zh-CN');
  }
}

// ==================== 系统设置功能 ====================

let currentSystemSettings = {};
let timeUpdateInterval = null;

// 加载系统设置
async function loadSystemSettings() {
  try {
    const response = await fetch('/api/system/settings');
    currentSystemSettings = await response.json();
    
    // 应用设置
    applySystemSettings(currentSystemSettings);
    
    // 启动时间更新
    startTimeUpdate();
  } catch (error) {
    console.error('加载系统设置失败:', error);
  }
}

// 应用系统设置
function applySystemSettings(settings) {
  // 更新标题
  if (settings.systemTitle) {
    document.getElementById('systemTitle').textContent = settings.systemTitle;
    document.title = settings.systemTitle;
  }
  
  // 更新描述
  if (settings.systemDescription) {
    document.getElementById('systemDescription').textContent = settings.systemDescription;
  }
  
  // 更新Logo
  if (settings.systemLogo) {
    const logoImg = document.getElementById('systemLogo');
    logoImg.src = settings.systemLogo;
    logoImg.style.display = 'block';
  }
  
  // 更新主题色
  if (settings.primaryColor) {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
  }
}

// 打开系统设置
document.getElementById('systemSettings').addEventListener('click', async () => {
  await loadSystemSettings();
  
  // 填充表单
  document.getElementById('systemName').value = currentSystemSettings.systemName || '';
  document.getElementById('systemTitleInput').value = currentSystemSettings.systemTitle || '';
  document.getElementById('systemDescriptionInput').value = currentSystemSettings.systemDescription || '';
  document.getElementById('primaryColor').value = currentSystemSettings.primaryColor || '#3498db';
  document.getElementById('primaryColorText').value = currentSystemSettings.primaryColor || '#3498db';
  
  // 填充时间设置
  document.getElementById('timezone').value = currentSystemSettings.timezone || 'Asia/Shanghai';
  document.getElementById('timeFormat').value = currentSystemSettings.timeFormat || '24h';
  document.getElementById('dateFormat').value = currentSystemSettings.dateFormat || 'YYYY-MM-DD';
  
  // 更新Logo预览
  const logoPreview = document.getElementById('logoPreview');
  logoPreview.src = currentSystemSettings.systemLogo || '/images/logo.svg';
  
  // 启动时间预览更新
  updateTimePreview();
  
  // 更新时间同步状态
  updateTimeSyncStatus();
  
  // 如果 NTP 服务器已启用，更新其状态
  if (document.getElementById('ntpServerEnabled').checked) {
    updateNTPServerStatus();
  }
  
  document.getElementById('systemSettingsModal').style.display = 'block';
});

// 关闭系统设置模态框
document.querySelector('#systemSettingsModal .close').addEventListener('click', () => {
  document.getElementById('systemSettingsModal').style.display = 'none';
});

document.getElementById('cancelSystemSettings').addEventListener('click', () => {
  document.getElementById('systemSettingsModal').style.display = 'none';
});

// 系统设置标签页切换
document.querySelectorAll('.settings-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.settingsTab;
    
    // 切换按钮状态
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 切换内容
    document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
    const tabMap = {
      'basic': 'basicSettings',
      'appearance': 'appearanceSettings',
      'time': 'timeSettings'
    };
    document.getElementById(tabMap[tabName]).classList.add('active');
  });
});

// 主题色输入同步
document.getElementById('primaryColor').addEventListener('input', (e) => {
  document.getElementById('primaryColorText').value = e.target.value;
});

document.getElementById('primaryColorText').addEventListener('input', (e) => {
  const color = e.target.value;
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    document.getElementById('primaryColor').value = color;
  }
});

// Logo上传
document.getElementById('logoUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // 验证文件大小
  if (file.size > 5 * 1024 * 1024) {
    alert('文件大小不能超过 5MB');
    return;
  }
  
  // 验证文件类型
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    alert('不支持的文件类型，请上传 PNG, JPG, GIF 或 SVG 格式的图片');
    return;
  }
  
  // 预览
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('logoPreview').src = e.target.result;
  };
  reader.readAsDataURL(file);
  
  // 上传
  const formData = new FormData();
  formData.append('logo', file);
  
  try {
    const response = await fetch('/api/system/logo/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      currentSystemSettings.systemLogo = result.path;
      alert('Logo上传成功');
    } else {
      alert('上传失败: ' + result.error);
      // 恢复预览
      document.getElementById('logoPreview').src = currentSystemSettings.systemLogo || '/images/logo.svg';
    }
  } catch (error) {
    alert('上传失败: ' + error.message);
    // 恢复预览
    document.getElementById('logoPreview').src = currentSystemSettings.systemLogo || '/images/logo.svg';
  }
});

// 重置Logo
async function resetLogo() {
  if (!confirm('确定要重置为默认Logo吗？')) return;
  
  try {
    const response = await fetch('/api/system/logo/reset', {
      method: 'POST'
    });
    
    if (response.ok) {
      currentSystemSettings.systemLogo = '/images/logo.svg';
      document.getElementById('logoPreview').src = '/images/logo.svg';
      alert('Logo已重置为默认');
    } else {
      const result = await response.json();
      alert('重置失败: ' + result.error);
    }
  } catch (error) {
    alert('重置失败: ' + error.message);
  }
}

// 保存系统设置
document.getElementById('systemSettingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const settings = {
    systemName: document.getElementById('systemName').value,
    systemTitle: document.getElementById('systemTitleInput').value,
    systemDescription: document.getElementById('systemDescriptionInput').value,
    primaryColor: document.getElementById('primaryColor').value,
    timezone: document.getElementById('timezone').value,
    timeFormat: document.getElementById('timeFormat').value,
    dateFormat: document.getElementById('dateFormat').value,
    timeSource: document.getElementById('timeSource').value,
    gpsPort: document.getElementById('gpsPort').value,
    gpsBaudRate: document.getElementById('gpsBaudRate').value,
    ppsDevice: document.getElementById('ppsDevice').value,
    syncInterval: document.getElementById('syncInterval').value
  };
  
  try {
    // 保存各项设置
    for (const [key, value] of Object.entries(settings)) {
      if (value) {
        await fetch('/api/system/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
      }
    }
    
    // 切换时间源
    const timeSource = document.getElementById('timeSource').value;
    await switchTimeSource(timeSource);
    
    alert('设置已保存，刷新页面后生效');
    document.getElementById('systemSettingsModal').style.display = 'none';
    
    // 重新加载设置
    await loadSystemSettings();
  } catch (error) {
    alert('保存失败: ' + error.message);
  }
});

// ==================== 设备拓扑图功能 ====================

let topologyData = {
  nodes: [],
  links: []
};

let topologyScale = 1;
let topologyTranslate = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };

// 加载拓扑图
async function loadTopology() {
  try {
    // 获取设备列表
    const response = await fetch('/api/devices');
    const deviceList = await response.json();
    
    // 获取活动告警
    const alarmResponse = await fetch('/api/alarms/active');
    const activeAlarms = await alarmResponse.json();
    
    // 构建拓扑数据
    buildTopologyData(deviceList, activeAlarms);
    
    // 渲染拓扑图
    renderTopology();
    
    // 更新统计信息
    updateTopologyStats(deviceList, activeAlarms);
  } catch (error) {
    console.error('加载拓扑图失败:', error);
  }
}

// 构建拓扑数据
function buildTopologyData(deviceList, activeAlarms) {
  topologyData.nodes = [];
  topologyData.links = [];
  
  // 计算画布中心
  const centerX = 400;
  const centerY = 225;
  
  // 添加中心节点（服务器）
  topologyData.nodes.push({
    id: 'server',
    type: 'server',
    name: '服务器',
    x: centerX,
    y: centerY,
    status: 'online'
  });
  
  // 按连接类型分组
  const rtuDevices = deviceList.filter(d => d.connection_type === 'rtu');
  const tcpDevices = deviceList.filter(d => d.connection_type === 'tcp');
  
  // 添加 RTU 设备节点
  rtuDevices.forEach((device, index) => {
    const angle = (index / rtuDevices.length) * Math.PI * 2;
    const radius = 150; // 减小半径
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    const hasAlarm = activeAlarms.some(a => a.deviceId === device.id);
    const status = !device.enabled ? 'disabled' : hasAlarm ? 'alarm' : 'online';
    
    topologyData.nodes.push({
      id: `device-${device.id}`,
      type: 'device',
      deviceType: 'rtu',
      name: device.name,
      device: device,
      x: x,
      y: y,
      status: status
    });
    
    topologyData.links.push({
      source: 'server',
      target: `device-${device.id}`,
      type: 'rtu'
    });
  });
  
  // 添加 TCP 设备节点
  tcpDevices.forEach((device, index) => {
    const angle = (index / tcpDevices.length) * Math.PI * 2 + Math.PI;
    const radius = 180; // 减小半径
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    const hasAlarm = activeAlarms.some(a => a.deviceId === device.id);
    const status = !device.enabled ? 'disabled' : hasAlarm ? 'alarm' : 'online';
    
    topologyData.nodes.push({
      id: `device-${device.id}`,
      type: 'device',
      deviceType: 'tcp',
      name: device.name,
      device: device,
      x: x,
      y: y,
      status: status
    });
    
    topologyData.links.push({
      source: 'server',
      target: `device-${device.id}`,
      type: 'tcp'
    });
  });
}

// 渲染拓扑图
function renderTopology() {
  const svg = document.getElementById('topologySvg');
  const width = svg.clientWidth;
  const height = 450;
  
  // 清空 SVG
  svg.innerHTML = '';
  
  // 创建主组
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(${topologyTranslate.x}, ${topologyTranslate.y}) scale(${topologyScale})`);
  svg.appendChild(g);
  
  // 绘制连接线
  topologyData.links.forEach(link => {
    const sourceNode = topologyData.nodes.find(n => n.id === link.source);
    const targetNode = topologyData.nodes.find(n => n.id === link.target);
    
    if (sourceNode && targetNode) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', sourceNode.x);
      line.setAttribute('y1', sourceNode.y);
      line.setAttribute('x2', targetNode.x);
      line.setAttribute('y2', targetNode.y);
      line.setAttribute('stroke', link.type === 'rtu' ? '#3498db' : '#2ecc71');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', link.type === 'rtu' ? '5,5' : '0');
      line.setAttribute('opacity', '0.6');
      g.appendChild(line);
    }
  });
  
  // 绘制节点
  topologyData.nodes.forEach(node => {
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('class', 'topology-node');
    nodeGroup.setAttribute('data-id', node.id);
    
    // 节点圆圈
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', node.type === 'server' ? 25 : 18); // 减小节点大小
    
    // 根据状态设置颜色
    const colors = {
      online: '#27ae60',
      offline: '#95a5a6',
      alarm: '#e74c3c',
      disabled: '#bdc3c7'
    };
    circle.setAttribute('fill', colors[node.status] || '#3498db');
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '3');
    
    // 添加动画效果（告警状态）
    if (node.status === 'alarm') {
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'r');
      animate.setAttribute('values', `${node.type === 'server' ? 25 : 18};${node.type === 'server' ? 30 : 23};${node.type === 'server' ? 25 : 18}`);
      animate.setAttribute('dur', '1.5s');
      animate.setAttribute('repeatCount', 'indefinite');
      circle.appendChild(animate);
    }
    
    nodeGroup.appendChild(circle);
    
    // 节点图标
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('x', node.x);
    icon.setAttribute('y', node.y + 4);
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('fill', 'white');
    icon.setAttribute('font-size', node.type === 'server' ? '18' : '14'); // 减小图标大小
    icon.setAttribute('font-weight', 'bold');
    icon.textContent = node.type === 'server' ? '🖥️' : (node.deviceType === 'rtu' ? '📡' : '🌐');
    nodeGroup.appendChild(icon);
    
    // 节点标签
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', node.x);
    label.setAttribute('y', node.y + (node.type === 'server' ? 40 : 32)); // 调整标签位置
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#2c3e50');
    label.setAttribute('font-size', '11'); // 减小字体
    label.setAttribute('font-weight', 'bold');
    label.textContent = node.name;
    nodeGroup.appendChild(label);
    
    // 添加点击事件
    nodeGroup.style.cursor = 'pointer';
    nodeGroup.addEventListener('click', () => showNodeDetails(node));
    
    g.appendChild(nodeGroup);
  });
  
  // 添加缩放和拖拽功能
  setupTopologyInteraction(svg);
}

// 设置拓扑图交互
function setupTopologyInteraction(svg) {
  let isPanning = false;
  let startPoint = { x: 0, y: 0 };
  
  svg.addEventListener('mousedown', (e) => {
    if (e.target === svg || e.target.tagName === 'g') {
      isPanning = true;
      startPoint = { x: e.clientX - topologyTranslate.x, y: e.clientY - topologyTranslate.y };
      svg.style.cursor = 'grabbing';
    }
  });
  
  svg.addEventListener('mousemove', (e) => {
    if (isPanning) {
      topologyTranslate.x = e.clientX - startPoint.x;
      topologyTranslate.y = e.clientY - startPoint.y;
      renderTopology();
    }
  });
  
  svg.addEventListener('mouseup', () => {
    isPanning = false;
    svg.style.cursor = 'default';
  });
  
  svg.addEventListener('mouseleave', () => {
    isPanning = false;
    svg.style.cursor = 'default';
  });
  
  // 鼠标滚轮缩放
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    topologyScale *= delta;
    topologyScale = Math.max(0.5, Math.min(2, topologyScale));
    renderTopology();
  });
}

// 显示节点详情
function showNodeDetails(node) {
  if (node.type === 'server') {
    alert('服务器节点\n\n负责管理所有设备的数据采集和监控');
    return;
  }
  
  const device = node.device;
  const statusText = {
    online: '在线',
    offline: '离线',
    alarm: '告警',
    disabled: '禁用'
  };
  
  const connectionInfo = device.connection_type === 'tcp' 
    ? `IP: ${device.ip_address}:${device.tcp_port}`
    : `串口: ${device.port}, 波特率: ${device.baudrate}`;
  
  const details = `
设备名称: ${device.name}
设备ID: ${device.id}
从站ID: ${device.slave_id}
连接类型: ${device.connection_type === 'tcp' ? 'Modbus TCP' : 'Modbus RTU'}
${connectionInfo}
寄存器地址: ${device.register_address}
寄存器数量: ${device.register_count}
数据类型: ${device.data_type}
采集间隔: ${device.interval}ms
状态: ${statusText[node.status]}
  `.trim();
  
  alert(details);
}

// 更新拓扑统计
function updateTopologyStats(deviceList, activeAlarms) {
  const total = deviceList.length;
  const enabled = deviceList.filter(d => d.enabled).length;
  const disabled = deviceList.filter(d => !d.enabled).length;
  const alarm = activeAlarms.length;
  const rtu = deviceList.filter(d => d.connection_type === 'rtu').length;
  const tcp = deviceList.filter(d => d.connection_type === 'tcp').length;
  
  document.getElementById('totalDevices').textContent = total;
  document.getElementById('onlineDevices').textContent = enabled - alarm;
  document.getElementById('offlineDevices').textContent = disabled;
  document.getElementById('alarmDevices').textContent = alarm;
  document.getElementById('rtuDevices').textContent = rtu;
  document.getElementById('tcpDevices').textContent = tcp;
}

// 自动布局
function autoLayoutTopology() {
  // 重新计算节点位置
  const centerX = 400;
  const centerY = 225;
  const deviceNodes = topologyData.nodes.filter(n => n.type === 'device');
  const radius = 165; // 减小半径
  
  deviceNodes.forEach((node, index) => {
    const angle = (index / deviceNodes.length) * Math.PI * 2;
    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius;
  });
  
  renderTopology();
}

// 重置视图
function resetZoom() {
  topologyScale = 1;
  topologyTranslate = { x: 0, y: 0 };
  renderTopology();
}

// 拓扑图控制按钮
document.getElementById('refreshTopology').addEventListener('click', loadTopology);
document.getElementById('autoLayoutTopology').addEventListener('click', autoLayoutTopology);
document.getElementById('resetZoom').addEventListener('click', resetZoom);

// ==================== 时间设置功能 ====================

// 格式化时间
function formatDateTime(date, settings) {
  if (!settings) settings = currentSystemSettings;
  
  const timezone = settings.timezone || 'Asia/Shanghai';
  const timeFormat = settings.timeFormat || '24h';
  const dateFormat = settings.dateFormat || 'YYYY-MM-DD';
  
  // 转换到指定时区
  const options = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: timeFormat === '12h'
  };
  
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN', options);
    const parts = formatter.formatToParts(date);
    
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    const dayPeriod = parts.find(p => p.type === 'dayPeriod');
    
    // 格式化日期
    let formattedDate = dateFormat
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('年', '年')
      .replace('月', '月')
      .replace('日', '日');
    
    // 格式化时间
    let formattedTime = `${hour}:${minute}:${second}`;
    if (timeFormat === '12h' && dayPeriod) {
      formattedTime += ` ${dayPeriod.value}`;
    }
    
    return `${formattedDate} ${formattedTime}`;
  } catch (error) {
    console.error('时间格式化失败:', error);
    return date.toLocaleString('zh-CN');
  }
}

// 更新时间预览
function updateTimePreview() {
  const timezone = document.getElementById('timezone').value;
  const timeFormat = document.getElementById('timeFormat').value;
  const dateFormat = document.getElementById('dateFormat').value;
  
  const settings = {
    timezone,
    timeFormat,
    dateFormat
  };
  
  const now = new Date();
  const formatted = formatDateTime(now, settings);
  
  const timeDisplay = document.getElementById('currentSystemTime');
  if (timeDisplay) {
    timeDisplay.textContent = formatted;
  }
}

// 启动时间更新
function startTimeUpdate() {
  // 清除旧的定时器
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
  
  // 每秒更新一次时间预览
  timeUpdateInterval = setInterval(() => {
    const timeDisplay = document.getElementById('currentSystemTime');
    if (timeDisplay && document.getElementById('systemSettingsModal').style.display === 'block') {
      updateTimePreview();
    }
  }, 1000);
}

// 时区、时间格式、日期格式变化时更新预览
document.getElementById('timezone').addEventListener('change', updateTimePreview);
document.getElementById('timeFormat').addEventListener('change', updateTimePreview);
document.getElementById('dateFormat').addEventListener('change', updateTimePreview);

// 应用时间格式到全局
function applyTimeFormat() {
  // 这个函数可以用来更新页面上所有的时间显示
  // 例如：图表、日志、告警时间等
  const timeElements = document.querySelectorAll('.timestamp, .alarm-time, .time-display');
  timeElements.forEach(element => {
    const timestamp = element.dataset.timestamp;
    if (timestamp) {
      const date = new Date(parseInt(timestamp));
      element.textContent = formatDateTime(date);
    }
  });
}

// 获取格式化的当前时间（供其他模块使用）
function getCurrentFormattedTime() {
  return formatDateTime(new Date());
}

// 导出格式化函数供其他模块使用
window.formatDateTime = formatDateTime;
window.getCurrentFormattedTime = getCurrentFormattedTime;

// ==================== NTP 时间同步功能 ====================

// ==================== 时间源管理功能 ====================

// 时间源切换
document.getElementById('timeSource').addEventListener('change', async (e) => {
  const source = e.target.value;
  
  // 显示/隐藏相关配置
  const isGPS = source === 'gps' || source === 'gps-pps';
  document.getElementById('gpsSettings').style.display = isGPS ? 'block' : 'none';
  document.getElementById('ppsSettings').style.display = source === 'gps-pps' ? 'block' : 'none';
  document.getElementById('ntpSettings').style.display = source === 'ntp' ? 'block' : 'none';
  
  // 立即切换时间源
  await switchTimeSource(source);
  
  // 同步更新 NTP 服务器的时钟源显示
  updateNTPServerClockSource(source);
  
  // 更新时间同步状态
  updateTimeSyncStatus();
});

// 更新时间同步状态
async function updateTimeSyncStatus() {
  try {
    const response = await fetch('/api/time/status');
    const status = await response.json();
    
    document.getElementById('currentTimeSource').textContent = getTimeSourceText(status.source);
    document.getElementById('lastTimeSync').textContent = status.lastSync 
      ? new Date(status.lastSync).toLocaleString('zh-CN')
      : '从未同步';
    document.getElementById('gpsStatus').textContent = status.isGPSAvailable ? '✅ 可用' : '❌ 不可用';
    
    // 更新 PPS 状态
    const ppsStatusEl = document.getElementById('ppsStatus');
    const ppsOffsetItem = document.getElementById('ppsOffsetItem');
    const ppsOffsetEl = document.getElementById('ppsOffset');
    
    if (status.source === 'gps-pps') {
      ppsStatusEl.textContent = status.isPPSAvailable ? '✅ 可用' : '❌ 不可用';
      
      if (status.isPPSAvailable && status.ppsOffset !== undefined) {
        ppsOffsetItem.style.display = 'flex';
        ppsOffsetEl.textContent = `${status.ppsOffset} ns`;
      } else {
        ppsOffsetItem.style.display = 'none';
      }
    } else {
      ppsStatusEl.textContent = '--';
      ppsOffsetItem.style.display = 'none';
    }
    
    // 更新时间源选择
    document.getElementById('timeSource').value = status.source;
    
    // 更新同步统计
    updateSyncStats();
    
  } catch (error) {
    console.error('获取时间同步状态失败:', error);
  }
}

// 更新同步统计
async function updateSyncStats() {
  try {
    // 获取健康状态
    const healthResponse = await fetch('/api/time/monitor/health');
    const health = await healthResponse.json();
    
    // 更新健康状态
    const healthStatusEl = document.getElementById('syncHealthStatus');
    const healthText = getHealthStatusText(health.status);
    const healthColor = getHealthStatusColor(health.status);
    healthStatusEl.innerHTML = `<span style="color: ${healthColor}; font-weight: bold;">${healthText}</span>`;
    
    // 获取统计数据
    const statsResponse = await fetch('/api/time/monitor/stats');
    const stats = await statsResponse.json();
    
    // 更新统计信息
    document.getElementById('syncTotalCount').textContent = stats.syncCount || 0;
    document.getElementById('syncSuccessRate').textContent = `${stats.successRate || 0}%`;
    document.getElementById('syncAvgDuration').textContent = `${stats.averageSyncDuration || 0} ms`;
    
  } catch (error) {
    console.error('获取同步统计失败:', error);
  }
}

// 获取健康状态文本
function getHealthStatusText(status) {
  const map = {
    'healthy': '✓ 健康',
    'warning': '⚠ 警告',
    'error': '✗ 异常'
  };
  return map[status] || status;
}

// 获取健康状态颜色
function getHealthStatusColor(status) {
  const map = {
    'healthy': '#27ae60',
    'warning': '#f39c12',
    'error': '#e74c3c'
  };
  return map[status] || '#999';
}

// 重置同步统计
async function resetSyncStats() {
  if (!confirm('确定要重置同步统计数据吗？')) {
    return;
  }
  
  try {
    const response = await fetch('/api/time/monitor/reset', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('统计已重置');
      updateSyncStats();
    } else {
      alert('重置失败: ' + result.error);
    }
  } catch (error) {
    alert('重置失败: ' + error.message);
  }
}

// 立即同步时间
async function syncTimeNow() {
  try {
    const response = await fetch('/api/time/sync', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(`时间同步成功！\n当前时间: ${new Date(result.timestamp).toLocaleString('zh-CN')}`);
      updateTimeSyncStatus();
      updateTimePreview();
    } else {
      alert('时间同步失败: ' + result.error);
    }
  } catch (error) {
    alert('时间同步失败: ' + error.message);
  }
}

// 切换时间源
async function switchTimeSource(newSource) {
  try {
    const response = await fetch('/api/time/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: newSource })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('时间源已切换:', result.source);
      updateTimeSyncStatus();
    } else {
      console.error('切换时间源失败:', result.error);
    }
  } catch (error) {
    console.error('切换时间源失败:', error);
  }
}

// 获取时间源文本
function getTimeSourceText(source) {
  const map = {
    'local': '本地时钟',
    'gps': 'GPS 时间 (NMEA)',
    'gps-pps': 'GPS + PPS (高精度)',
    'ntp': 'NTP 服务器'
  };
  return map[source] || source;
}

// 在打开系统设置时更新时间同步状态
const originalOpenSettings = document.getElementById('systemSettings').onclick;
document.getElementById('systemSettings').addEventListener('click', async () => {
  // 延迟更新，确保模态框已打开
  setTimeout(() => {
    updateTimeSyncStatus();
  }, 100);
});

// 定期更新时间同步状态（每30秒）
setInterval(() => {
  const modal = document.getElementById('systemSettingsModal');
  if (modal && modal.style.display === 'block') {
    updateTimeSyncStatus();
  }
}, 30000);


// ==================== NTP 服务器管理功能 ====================

// NTP 服务器启用切换
document.getElementById('ntpServerEnabled').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  document.getElementById('ntpServerSettings').style.display = enabled ? 'block' : 'none';
  
  if (enabled) {
    updateNTPServerStatus();
  }
});

// 启动 NTP 服务器
document.getElementById('startNtpServer').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/ntp/server/start', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('NTP 服务器已启动');
      updateNTPServerStatus();
    } else {
      alert('启动失败: ' + result.error);
    }
  } catch (error) {
    alert('启动失败: ' + error.message);
  }
});

// 停止 NTP 服务器
document.getElementById('stopNtpServer').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/ntp/server/stop', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('NTP 服务器已停止');
      updateNTPServerStatus();
    } else {
      alert('停止失败: ' + result.error);
    }
  } catch (error) {
    alert('停止失败: ' + error.message);
  }
});

// 刷新 NTP 服务器状态
document.getElementById('refreshNtpServerStatus').addEventListener('click', () => {
  updateNTPServerStatus();
});

// 更新 NTP 服务器时钟源显示
function updateNTPServerClockSource(systemTimeSource) {
  const clockSourceSelect = document.getElementById('ntpServerClockSource');
  clockSourceSelect.value = systemTimeSource;
  
  // 根据系统时间源更新层级说明
  const stratumInput = document.getElementById('ntpServerStratum');
  if (systemTimeSource === 'ntp') {
    // 如果系统使用 NTP，本服务器应该是二级（Stratum 2）
    stratumInput.value = 2;
    stratumInput.placeholder = '2（二级 NTP 服务器）';
  } else if (systemTimeSource === 'gps' || systemTimeSource === 'gps-pps') {
    // 如果系统使用 GPS，本服务器是一级（Stratum 1）
    stratumInput.value = 1;
    stratumInput.placeholder = '1（主时钟源）';
  } else {
    // 本地时钟
    stratumInput.value = 10;
    stratumInput.placeholder = '10（本地时钟）';
  }
}

// 更新 NTP 服务器状态
async function updateNTPServerStatus() {
  try {
    const response = await fetch('/api/ntp/server/status');
    const status = await response.json();
    
    document.getElementById('ntpServerRunning').textContent = status.isRunning ? '✅ 运行中' : '❌ 已停止';
    document.getElementById('ntpServerCurrentSource').textContent = getTimeSourceText(status.clockSource);
    document.getElementById('ntpServerRequests').textContent = status.requestCount || 0;
    document.getElementById('ntpServerLastRequest').textContent = status.lastRequestTime 
      ? new Date(status.lastRequestTime).toLocaleString('zh-CN')
      : '无';
    
    // 更新时钟源选择
    document.getElementById('ntpServerClockSource').value = status.clockSource;
    
  } catch (error) {
    console.error('获取 NTP 服务器状态失败:', error);
  }
}

// 注意：NTP 服务器时钟源自动跟随系统时间源，不需要手动切换

// 定期更新 NTP 服务器状态（每 10 秒）
setInterval(() => {
  const modal = document.getElementById('systemSettingsModal');
  const ntpServerEnabled = document.getElementById('ntpServerEnabled').checked;
  
  if (modal && modal.style.display === 'block' && ntpServerEnabled) {
    updateNTPServerStatus();
  }
}, 10000);


// 定期更新时间同步状态和统计（每 10 秒）
setInterval(() => {
  const modal = document.getElementById('systemSettingsModal');
  
  if (modal && modal.style.display === 'block') {
    // 更新时间同步状态和统计
    updateTimeSyncStatus();
    
    // 如果 NTP 服务器已启用，更新其状态
    const ntpServerEnabled = document.getElementById('ntpServerEnabled');
    if (ntpServerEnabled && ntpServerEnabled.checked) {
      updateNTPServerStatus();
    }
  }
}, 10000);


// ==================== 位置管理功能 ====================

let locations = [];
let currentEditingLocationId = null;

// 加载位置列表
async function loadLocations() {
  try {
    const response = await fetch('/api/locations');
    locations = await response.json();
    updateLocationSelects();
    return locations;
  } catch (error) {
    console.error('加载位置列表失败:', error);
    return [];
  }
}

// 更新位置选择下拉框
function updateLocationSelects() {
  const deviceLocationSelect = document.getElementById('locationId');
  const parentLocationSelect = document.getElementById('locationParent');
  
  if (deviceLocationSelect) {
    deviceLocationSelect.innerHTML = '<option value="">未指定位置</option>';
    locations.forEach(location => {
      const option = document.createElement('option');
      option.value = location.id;
      option.textContent = getLocationFullName(location);
      deviceLocationSelect.appendChild(option);
    });
  }
  
  if (parentLocationSelect) {
    parentLocationSelect.innerHTML = '<option value="">无（顶级位置）</option>';
    locations.forEach(location => {
      if (location.id !== currentEditingLocationId) {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = getLocationFullName(location);
        parentLocationSelect.appendChild(option);
      }
    });
  }
}

// 获取位置全名（包含层级）
function getLocationFullName(location) {
  const parent = locations.find(l => l.id === location.parent_id);
  if (parent) {
    return `${getLocationFullName(parent)} > ${location.name}`;
  }
  return location.name;
}

// 获取设备位置名称
function getDeviceLocationName(device) {
  if (!device.location_id) {
    return buildLocationString(device);
  }
  
  const location = locations.find(l => l.id === device.location_id);
  const locationName = location ? getLocationFullName(location) : '未知位置';
  
  const parts = [locationName];
  if (device.floor) parts.push(`${device.floor}`);
  if (device.room) parts.push(`${device.room}`);
  if (device.rack) parts.push(`${device.rack}`);
  
  return parts.join(' / ') || '未指定';
}

// 构建位置字符串（当没有选择位置时）
function buildLocationString(device) {
  const parts = [];
  if (device.floor) parts.push(device.floor);
  if (device.room) parts.push(device.room);
  if (device.rack) parts.push(device.rack);
  
  return parts.length > 0 ? parts.join(' / ') : '未指定';
}

// 打开位置管理器
async function openLocationManager() {
  await loadLocations();
  renderLocationTree();
  document.getElementById('locationManagerModal').style.display = 'block';
}

// 关闭位置管理器
function closeLocationManager() {
  document.getElementById('locationManagerModal').style.display = 'none';
}

// 渲染位置树
function renderLocationTree() {
  const container = document.getElementById('locationTree');
  container.innerHTML = '';
  
  if (locations.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无位置信息</div>';
    return;
  }
  
  // 构建树形结构
  const tree = buildLocationTree(locations);
  
  // 渲染树
  tree.forEach(location => {
    renderLocationNode(container, location, 0);
  });
}

// 构建位置树
function buildLocationTree(locations) {
  const locationMap = {};
  const rootLocations = [];
  
  // 创建位置映射
  locations.forEach(location => {
    locationMap[location.id] = { ...location, children: [] };
  });
  
  // 构建父子关系
  locations.forEach(location => {
    if (location.parent_id) {
      const parent = locationMap[location.parent_id];
      if (parent) {
        parent.children.push(locationMap[location.id]);
      }
    } else {
      rootLocations.push(locationMap[location.id]);
    }
  });
  
  return rootLocations;
}

// 渲染位置节点
function renderLocationNode(container, location, level) {
  const div = document.createElement('div');
  div.className = `location-item location-level-${level}`;
  
  // 获取该位置的设备数量
  const deviceCount = getDeviceCountForLocation(location.id);
  
  div.innerHTML = `
    <div class="location-info">
      <div class="location-name">${location.name}</div>
      <div class="location-details">
        <span class="location-type ${location.type}">${getLocationTypeText(location.type)}</span>
        ${location.address ? `<span>📍 ${location.address}</span>` : ''}
        ${deviceCount > 0 ? `<span class="device-count">${deviceCount} 个设备</span>` : ''}
      </div>
    </div>
    <div class="location-actions">
      <button class="btn btn-info" onclick="editLocation(${location.id})">编辑</button>
      <button class="btn btn-danger" onclick="deleteLocation(${location.id})">删除</button>
    </div>
  `;
  
  container.appendChild(div);
  
  // 渲染子位置
  if (location.children && location.children.length > 0) {
    location.children.forEach(child => {
      renderLocationNode(container, child, level + 1);
    });
  }
}

// 获取位置类型文本
function getLocationTypeText(type) {
  const typeMap = {
    building: '建筑物',
    floor: '楼层',
    room: '房间',
    area: '区域',
    workshop: '车间',
    office: '办公室',
    warehouse: '仓库',
    other: '其他'
  };
  return typeMap[type] || type;
}

// 获取位置的设备数量
function getDeviceCountForLocation(locationId) {
  return devices.filter(d => d.location_id === locationId).length;
}

// 打开添加位置表单
function openAddLocationForm() {
  currentEditingLocationId = null;
  document.getElementById('locationFormTitle').textContent = '添加位置';
  document.getElementById('locationForm').reset();
  document.getElementById('locationFormId').value = '';
  updateLocationSelects();
  document.getElementById('locationFormModal').style.display = 'block';
}

// 编辑位置
function editLocation(id) {
  const location = locations.find(l => l.id === id);
  if (!location) return;
  
  currentEditingLocationId = id;
  document.getElementById('locationFormTitle').textContent = '编辑位置';
  document.getElementById('locationFormId').value = id;
  document.getElementById('locationName').value = location.name;
  document.getElementById('locationType').value = location.type;
  document.getElementById('locationParent').value = location.parent_id || '';
  document.getElementById('locationAddress').value = location.address || '';
  document.getElementById('locationLatitude').value = location.latitude || '';
  document.getElementById('locationLongitude').value = location.longitude || '';
  document.getElementById('locationDescription').value = location.description || '';
  
  updateLocationSelects();
  document.getElementById('locationFormModal').style.display = 'block';
}

// 删除位置
async function deleteLocation(id) {
  const location = locations.find(l => l.id === id);
  if (!location) return;
  
  if (!confirm(`确定要删除位置 "${location.name}" 吗？`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/locations/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('位置已删除');
      await loadLocations();
      renderLocationTree();
    } else {
      alert('删除失败: ' + result.error);
    }
  } catch (error) {
    alert('删除失败: ' + error.message);
  }
}

// 关闭位置表单
function closeLocationForm() {
  document.getElementById('locationFormModal').style.display = 'none';
  currentEditingLocationId = null;
}

// 位置表单提交
document.getElementById('locationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('locationName').value,
    type: document.getElementById('locationType').value,
    parent_id: document.getElementById('locationParent').value || null,
    address: document.getElementById('locationAddress').value,
    latitude: document.getElementById('locationLatitude').value || null,
    longitude: document.getElementById('locationLongitude').value || null,
    description: document.getElementById('locationDescription').value
  };
  
  try {
    const id = document.getElementById('locationFormId').value;
    const isEdit = id !== '';
    
    const response = await fetch(isEdit ? `/api/locations/${id}` : '/api/locations', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(isEdit ? '位置已更新' : '位置已添加');
      closeLocationForm();
      await loadLocations();
      renderLocationTree();
    } else {
      alert('保存失败: ' + result.error);
    }
  } catch (error) {
    alert('保存失败: ' + error.message);
  }
});

// 页面加载时初始化位置数据
document.addEventListener('DOMContentLoaded', () => {
  loadLocations();
});
