const nodemailer = require('nodemailer');
const axios = require('axios');

class NotificationManager {
  constructor(config) {
    this.config = config || {};
    this.emailTransporter = null;
    this.initEmailTransporter();
  }

  // 初始化邮件发送器
  initEmailTransporter() {
    if (this.config.email && this.config.email.enabled) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: this.config.email.host,
          port: this.config.email.port,
          secure: this.config.email.secure,
          auth: {
            user: this.config.email.user,
            pass: this.config.email.password
          }
        });
        console.log('邮件通知已启用');
      } catch (err) {
        console.error('邮件配置初始化失败:', err.message);
      }
    }
  }

  // 发送告警通知
  async sendAlarmNotification(alarm, notificationConfig) {
    const promises = [];

    // 邮件通知
    if (notificationConfig.email && this.config.email?.enabled) {
      promises.push(this.sendEmail(alarm, notificationConfig.email));
    }

    // 短信通知
    if (notificationConfig.sms && this.config.sms?.enabled) {
      promises.push(this.sendSMS(alarm, notificationConfig.sms));
    }

    // 企业微信通知
    if (notificationConfig.wecom && this.config.wecom?.enabled) {
      promises.push(this.sendWeComMessage(alarm));
    }

    // 钉钉通知
    if (notificationConfig.dingtalk && this.config.dingtalk?.enabled) {
      promises.push(this.sendDingTalkMessage(alarm));
    }

    const results = await Promise.allSettled(promises);
    
    // 记录失败的通知
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`通知发送失败:`, result.reason);
      }
    });

    return results;
  }

  // 发送邮件
  async sendEmail(alarm, recipients) {
    if (!this.emailTransporter) {
      throw new Error('邮件服务未配置');
    }

    const levelEmoji = {
      critical: '🔴',
      warning: '🟡',
      info: '🔵'
    };

    const levelText = {
      critical: '严重',
      warning: '警告',
      info: '信息'
    };

    const mailOptions = {
      from: this.config.email.from,
      to: recipients.join(','),
      subject: `${levelEmoji[alarm.level]} [${levelText[alarm.level]}告警] ${alarm.ruleName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">${levelEmoji[alarm.level]} 告警通知</h2>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>告警规则:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${alarm.ruleName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>设备名称:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${alarm.deviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>告警级别:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                  <span style="background: ${alarm.level === 'critical' ? '#e74c3c' : alarm.level === 'warning' ? '#f39c12' : '#3498db'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                    ${levelText[alarm.level]}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>当前值:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${alarm.value.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>阈值:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${alarm.threshold}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>告警消息:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${alarm.message}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>触发时间:</strong></td>
                <td style="padding: 10px;">${new Date(alarm.triggeredAt).toLocaleString('zh-CN')}</td>
              </tr>
            </table>
          </div>
          <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            <p style="margin: 0; color: #856404;">
              <strong>提示:</strong> 请及时处理此告警，并在系统中确认。
            </p>
          </div>
        </div>
      `
    };

    await this.emailTransporter.sendMail(mailOptions);
    console.log(`邮件通知已发送: ${recipients.join(', ')}`);
  }

  // 发送短信（阿里云短信示例）
  async sendSMS(alarm, phoneNumbers) {
    if (!this.config.sms) {
      throw new Error('短信服务未配置');
    }

    const levelText = {
      critical: '严重',
      warning: '警告',
      info: '信息'
    };

    // 这里使用阿里云短信服务作为示例
    // 实际使用时需要安装 @alicloud/dysmsapi20170525 包
    const message = `【告警通知】${levelText[alarm.level]}告警：${alarm.deviceName} ${alarm.message}`;

    try {
      // 示例：使用HTTP API发送短信
      const response = await axios.post(this.config.sms.apiUrl, {
        apiKey: this.config.sms.apiKey,
        phoneNumbers: phoneNumbers,
        message: message,
        signName: this.config.sms.signName,
        templateCode: this.config.sms.templateCode
      });

      console.log(`短信通知已发送: ${phoneNumbers.join(', ')}`);
      return response.data;
    } catch (err) {
      console.error('短信发送失败:', err.message);
      throw err;
    }
  }

  // 发送企业微信消息
  async sendWeComMessage(alarm) {
    if (!this.config.wecom) {
      throw new Error('企业微信未配置');
    }

    const levelEmoji = {
      critical: '🔴',
      warning: '🟡',
      info: '🔵'
    };

    const levelText = {
      critical: '严重',
      warning: '警告',
      info: '信息'
    };

    const markdown = `# ${levelEmoji[alarm.level]} 告警通知
    
> **告警规则**: ${alarm.ruleName}
> **设备名称**: ${alarm.deviceName}
> **告警级别**: <font color="${alarm.level === 'critical' ? 'warning' : 'info'}">${levelText[alarm.level]}</font>
> **当前值**: ${alarm.value.toFixed(2)}
> **阈值**: ${alarm.threshold}
> **告警消息**: ${alarm.message}
> **触发时间**: ${new Date(alarm.triggeredAt).toLocaleString('zh-CN')}

请及时处理此告警！`;

    try {
      const response = await axios.post(this.config.wecom.webhookUrl, {
        msgtype: 'markdown',
        markdown: {
          content: markdown
        }
      });

      console.log('企业微信通知已发送');
      return response.data;
    } catch (err) {
      console.error('企业微信通知发送失败:', err.message);
      throw err;
    }
  }

  // 发送钉钉消息
  async sendDingTalkMessage(alarm) {
    if (!this.config.dingtalk) {
      throw new Error('钉钉未配置');
    }

    const levelEmoji = {
      critical: '🔴',
      warning: '🟡',
      info: '🔵'
    };

    const levelText = {
      critical: '严重',
      warning: '警告',
      info: '信息'
    };

    const markdown = `# ${levelEmoji[alarm.level]} 告警通知
    
**告警规则**: ${alarm.ruleName}

**设备名称**: ${alarm.deviceName}

**告警级别**: ${levelText[alarm.level]}

**当前值**: ${alarm.value.toFixed(2)}

**阈值**: ${alarm.threshold}

**告警消息**: ${alarm.message}

**触发时间**: ${new Date(alarm.triggeredAt).toLocaleString('zh-CN')}

---

请及时处理此告警！`;

    try {
      const response = await axios.post(this.config.dingtalk.webhookUrl, {
        msgtype: 'markdown',
        markdown: {
          title: `${levelEmoji[alarm.level]} ${alarm.ruleName}`,
          text: markdown
        }
      });

      console.log('钉钉通知已发送');
      return response.data;
    } catch (err) {
      console.error('钉钉通知发送失败:', err.message);
      throw err;
    }
  }

  // 更新配置
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.initEmailTransporter();
  }
}

module.exports = NotificationManager;
