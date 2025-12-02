// 系统配置
module.exports = {
  // 系统名称
  name: process.env.SYSTEM_NAME || 'Modbus RTU Manager',
  
  // 系统Logo（相对于public目录）
  logo: process.env.SYSTEM_LOGO || '/images/logo.svg',
  
  // 系统标题
  title: process.env.SYSTEM_TITLE || 'Modbus RTU 设备管理系统',
  
  // 系统描述
  description: process.env.SYSTEM_DESCRIPTION || '工业设备管理与监控平台',
  
  // 主题色
  primaryColor: process.env.PRIMARY_COLOR || '#3498db',
  
  // 上传配置
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml']
  }
};
