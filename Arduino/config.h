// 配置文件 - modbus温湿度传感器读取程序

// 串口配置
#define SERIAL_BAUD 9600

// 读取间隔，单位毫秒
#define READ_INTERVAL 10000

// 传感器数量
#define SENSOR_COUNT 2

// RS485控制引脚
#define DE_PIN 2
#define RE_PIN 3

// 传感器配置结构体
typedef struct {
  uint8_t slaveId;         // 从机ID
  uint16_t tempRegister;   // 温度寄存器地址
  uint16_t humRegister;    // 湿度寄存器地址
  const char* name;        // 传感器名称
} SensorConfig;

// 传感器配置数组
extern SensorConfig sensors[SENSOR_COUNT];
