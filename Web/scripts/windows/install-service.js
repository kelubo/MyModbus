const Service = require('node-windows').Service;
const path = require('path');

// 创建一个新的服务对象
const svc = new Service({
  name: 'Modbus RTU Manager',
  description: 'Modbus RTU设备管理系统服务',
  script: path.join(__dirname, '..', '..', 'src', 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "PORT",
      value: "3000"
    }
  ]
});

// 监听安装事件
svc.on('install', function() {
  console.log('服务安装成功！');
  console.log('服务名称: Modbus RTU Manager');
  console.log('正在启动服务...');
  svc.start();
});

svc.on('start', function() {
  console.log('服务已启动！');
  console.log('服务将在系统启动时自动运行');
  console.log('访问地址: http://localhost:3000');
});

svc.on('alreadyinstalled', function() {
  console.log('服务已经安装过了');
});

svc.on('error', function(err) {
  console.error('错误:', err);
});

// 安装服务
console.log('正在安装 Modbus RTU Manager 服务...');
console.log('注意: 此操作需要管理员权限');
svc.install();
