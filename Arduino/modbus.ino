#include <ModbusMaster.h>
#include <SoftwareSerial.h>

// 配置参数
#define SERIAL_BAUD 9600
#define READ_INTERVAL 10000 // 读取间隔，单位毫秒

// 传感器配置
#define SENSOR_COUNT 2

// 传感器结构体
struct SensorConfig {
  uint8_t slaveId;
  uint16_t tempRegister;
  uint16_t humRegister;
  const char* name;
};

// 传感器配置数组
SensorConfig sensors[SENSOR_COUNT] = {
  {1, 0x0000, 0x0001, "Sensor1"},
  {2, 0x0000, 0x0001, "Sensor2"}
};

// ModbusMaster对象
ModbusMaster node;

// RS485控制引脚
#define DE_PIN 2
#define RE_PIN 3

void setup() {
  // 初始化串口
  Serial.begin(9600);
  while (!Serial) {
    ; // 等待串口连接
  }
  
  // 初始化RS485控制引脚
  pinMode(DE_PIN, OUTPUT);
  pinMode(RE_PIN, OUTPUT);
  digitalWrite(DE_PIN, LOW);
  digitalWrite(RE_PIN, LOW);
  
  // 配置ModbusMaster
  node.begin(1, Serial);
  
  Serial.println("Modbus RS485温湿度传感器读取程序启动");
}

void loop() {
  // 读取所有传感器数据
  for (int i = 0; i < SENSOR_COUNT; i++) {
    readSensorData(sensors[i]);
    delay(100); // 传感器之间的延迟
  }
  
  // 等待下一次读取
  delay(READ_INTERVAL);
}

void readSensorData(SensorConfig sensor) {
  uint8_t result;
  uint16_t data[2];
  
  // 切换Modbus从机ID
  node.setSlaveId(sensor.slaveId);
  
  // 启用发送模式
  digitalWrite(DE_PIN, HIGH);
  digitalWrite(RE_PIN, HIGH);
  delay(1);
  
  // 读取温度和湿度寄存器
  result = node.readHoldingRegisters(sensor.tempRegister, 2);
  
  // 禁用发送模式，启用接收模式
  delay(1);
  digitalWrite(DE_PIN, LOW);
  digitalWrite(RE_PIN, LOW);
  
  if (result == node.ku8MBSuccess) {
    // 解析数据
    float temperature = node.getResponseBuffer(0) / 10.0;
    float humidity = node.getResponseBuffer(1) / 10.0;
    
    // 输出数据
    Serial.print(F("传感器: "));
    Serial.print(sensor.name);
    Serial.print(F(", 从机ID: "));
    Serial.print(sensor.slaveId);
    Serial.print(F(", 温度: "));
    Serial.print(temperature);
    Serial.print(F("°C, 湿度: "));
    Serial.print(humidity);
    Serial.println(F("%"));
    
    // 这里可以添加数据存储逻辑，如SD卡存储
  } else {
    Serial.print(F("读取传感器 "));
    Serial.print(sensor.name);
    Serial.print(F(" 失败, 错误代码: "));
    Serial.println(result, HEX);
  }
}
