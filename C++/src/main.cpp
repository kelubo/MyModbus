#include <iostream>
#include <chrono>
#include <thread>
#include <csignal>
#include <atomic>
#include <memory>
#include <iomanip>
#include <sstream>

#include "config.h"
#include "sensor_reader.h"
#include "data_storage.h"

#ifdef _WIN32
    #include <windows.h>
    #define SLEEP_MS(ms) Sleep(ms)
#else
    #include <unistd.h>
    #define SLEEP_MS(ms) usleep((ms) * 1000)
#endif

std::atomic<bool> keepRunning(true);

#ifdef _WIN32
BOOL WINAPI consoleHandler(DWORD ctrlType) {
    if (ctrlType == CTRL_C_EVENT) {
        keepRunning = false;
        return TRUE;
    }
    return FALSE;
}
#else
void signalHandler(int sig) {
    (void)sig;
    keepRunning = false;
}
#endif

void printSensorData(const std::vector<SensorData>& data) {
    auto now = std::chrono::system_clock::now();
    auto time_t_now = std::chrono::system_clock::to_time_t(now);
    std::tm* tm_info = std::localtime(&time_t_now);

    std::ostringstream oss;
    oss << std::put_time(tm_info, "%Y-%m-%d %H:%M:%S");
    std::cout << "[" << oss.str() << "]" << std::endl;

    for (const auto& sensor : data) {
        if (sensor.error) {
            std::cout << "  " << sensor.name << ": 读取失败 - " << sensor.error_message << std::endl;
        } else {
            std::cout << "  " << sensor.name << ": "
                      << "温度=" << std::fixed << std::setprecision(1) << sensor.temperature << "°C, "
                      << "湿度=" << sensor.humidity << "%" << std::endl;
        }
    }
    std::cout << std::endl;
}

std::vector<SensorRecord> convertToRecords(const std::vector<SensorData>& data,
                                           const std::vector<SensorConfig>& configs) {
    std::vector<SensorRecord> records;
    records.reserve(data.size());

    auto now = std::chrono::system_clock::now();

    for (size_t i = 0; i < data.size(); ++i) {
        if (!data[i].error) {
            SensorRecord record;
            record.sensor_name = data[i].name;
            record.slave_id = data[i].slave_id;
            record.temperature = data[i].temperature;
            record.humidity = data[i].humidity;
            record.timestamp = now;
            records.push_back(record);
        }
    }

    return records;
}

int main() {
    std::string configFilename = "config.json";

    std::cout << "Modbus温湿度传感器读取程序 (C++)" << std::endl;
    std::cout << "==============================" << std::endl;

    if (!Config::exists(configFilename)) {
        std::cout << "配置文件 " << configFilename << " 不存在，使用默认配置" << std::endl;
    }

    AppConfig config = Config::exists(configFilename) ?
                      Config::load(configFilename) : Config::loadDefault();

    config.print();

#ifdef _WIN32
    if (!SetConsoleCtrlHandler(consoleHandler, TRUE)) {
        std::cerr << "警告: 无法设置Ctrl+C处理器" << std::endl;
    }
#else
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);
#endif

    std::cout << std::endl;
    std::cout << "正在初始化Modbus连接..." << std::endl;

    SensorReader reader(
        config.modbus.port,
        config.modbus.baudrate,
        config.modbus.data_bits,
        config.modbus.stop_bits,
        config.modbus.parity,
        static_cast<int>(config.getTimeout().count())
    );

    if (!reader.connect()) {
        std::cerr << "错误: 无法连接到设备 " << config.modbus.port << std::endl;
        return 1;
    }

    std::cout << "成功连接到设备 " << config.modbus.port << std::endl;
    std::cout << "已配置 " << config.modbus.sensors.size() << " 个传感器" << std::endl;
    std::cout << "开始读取温湿度数据..." << std::endl;
    std::cout << "按 Ctrl+C 退出程序" << std::endl;
    std::cout << std::endl;

    std::unique_ptr<DataStorage> storage = StorageFactory::create(
        config.storage.type,
        config.storage
    );

    if (storage) {
        std::cout << "数据存储已启用: " << StorageFactory::storageTypeToString(config.storage.type) << std::endl;
    } else {
        std::cout << "数据存储已禁用" << std::endl;
    }

    std::vector<std::tuple<uint8_t, uint16_t, uint16_t, double, double, std::string>> sensorParams;
    for (const auto& sensor : config.modbus.sensors) {
        sensorParams.push_back(std::make_tuple(
            sensor.slave_id,
            sensor.temp_reg,
            sensor.humi_reg,
            sensor.temp_scale,
            sensor.humi_scale,
            sensor.name
        ));
    }

    while (keepRunning) {
        std::vector<SensorData> results = reader.readAllSensors(sensorParams);
        printSensorData(results);

        if (storage) {
            std::vector<SensorRecord> records = convertToRecords(results, config.modbus.sensors);
            if (!records.empty()) {
                storage->saveBatch(records);
            }
        }

        SLEEP_MS(static_cast<int>(config.getReadInterval().count() * 1000));
    }

    std::cout << std::endl;
    std::cout << "正在关闭连接..." << std::endl;
    reader.disconnect();
    std::cout << "程序已退出" << std::endl;

    return 0;
}
