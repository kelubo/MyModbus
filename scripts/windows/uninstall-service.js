const Service = require('node-windows').Service;
const path = require('path');

// 创建一个新的服务对象
const svc = new Service({
  name: 'Modbus RTU Manager',
  script: path.join(__dirname, '..', '..', 'src', 'server.js')
});

// 监听卸载事件
svc.on('uninstall', function() {
  console.log('服务卸载成功！');
  console.log('服务已从系统中移除');
});

svc.on('alreadyuninstalled', function() {
  console.log('服务未安装或已经卸载');
});

svc.on('error', function(err) {
  console.error('错误:', err);
});

// 卸载服务
console.log('正在卸载 Modbus RTU Manager 服务...');
console.log('注意: 此操作需要管理员权限');
svc.uninstall();
