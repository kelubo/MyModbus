#include "config.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <cctype>

namespace {

std::string trim(const std::string& str) {
    size_t start = str.find_first_not_of(" \t\n\r");
    if (start == std::string::npos) return "";
    size_t end = str.find_last_not_of(" \t\n\r");
    return str.substr(start, end - start + 1);
}

std::string extractStringValue(const std::string& json, const std::string& key) {
    std::string searchKey = "\"" + key + "\"";
    size_t keyPos = json.find(searchKey);
    if (keyPos == std::string::npos) return "";

    size_t colonPos = json.find(":", keyPos);
    if (colonPos == std::string::npos) return "";

    size_t valueStart = json.find("\"", colonPos);
    if (valueStart == std::string::npos) return "";

    size_t valueEnd = json.find("\"", valueStart + 1);
    if (valueEnd == std::string::npos) return "";

    return json.substr(valueStart + 1, valueEnd - valueStart - 1);
}

int extractIntValue(const std::string& json, const std::string& key) {
    std::string value = extractStringValue(json, key);
    if (value.empty()) return 0;
    try {
        return std::stoi(value);
    } catch (...) {
        return 0;
    }
}

double extractDoubleValue(const std::string& json, const std::string& key) {
    std::string value = extractStringValue(json, key);
    if (value.empty()) return 0.0;
    try {
        return std::stod(value);
    } catch (...) {
        return 0.0;
    }
}

std::vector<PortConfig> extractPortArray(const std::string& json) {
    std::vector<PortConfig> ports;
    std::string portArrayStart = "\"ports\"";
    size_t arrayStart = json.find(portArrayStart);
    if (arrayStart == std::string::npos) return ports;

    size_t bracketOpen = json.find("[", arrayStart);
    size_t bracketClose = json.find("]", bracketOpen);
    if (bracketOpen == std::string::npos || bracketClose == std::string::npos) return ports;

    std::string arrayContent = json.substr(bracketOpen + 1, bracketClose - bracketOpen - 1);

    size_t objectStart = 0;
    while ((objectStart = arrayContent.find("{", objectStart)) != std::string::npos) {
        size_t objectEnd = arrayContent.find("}", objectStart);
        if (objectEnd == std::string::npos) break;

        std::string objectContent = arrayContent.substr(objectStart, objectEnd - objectStart + 1);

        PortConfig port;
        port.name = extractStringValue(objectContent, "name");
        port.port = extractStringValue(objectContent, "port");
        port.baudrate = extractIntValue(objectContent, "baudrate");
        port.data_bits = extractIntValue(objectContent, "data_bits");
        port.stop_bits = extractIntValue(objectContent, "stop_bits");
        std::string parityStr = extractStringValue(objectContent, "parity");
        port.parity = parityStr.empty() ? 'N' : parityStr[0];
        port.timeout = extractDoubleValue(objectContent, "timeout");

        ports.push_back(port);
        objectStart = objectEnd + 1;
    }

    return ports;
}

std::vector<SensorConfig> extractSensorArray(const std::string& json) {
    std::vector<SensorConfig> sensors;
    std::string sensorArrayStart = "\"sensors\"";
    size_t arrayStart = json.find(sensorArrayStart);
    if (arrayStart == std::string::npos) return sensors;

    size_t bracketOpen = json.find("[", arrayStart);
    size_t bracketClose = json.find("]", bracketOpen);
    if (bracketOpen == std::string::npos || bracketClose == std::string::npos) return sensors;

    std::string arrayContent = json.substr(bracketOpen + 1, bracketClose - bracketOpen - 1);

    size_t objectStart = 0;
    while ((objectStart = arrayContent.find("{", objectStart)) != std::string::npos) {
        size_t objectEnd = arrayContent.find("}", objectStart);
        if (objectEnd == std::string::npos) break;

        std::string objectContent = arrayContent.substr(objectStart, objectEnd - objectStart + 1);

        SensorConfig sensor;
        sensor.name = extractStringValue(objectContent, "name");
        sensor.slave_id = static_cast<uint8_t>(extractIntValue(objectContent, "slave_id"));
        sensor.temp_reg = static_cast<uint16_t>(extractIntValue(objectContent, "temp_reg"));
        sensor.humi_reg = static_cast<uint16_t>(extractIntValue(objectContent, "humi_reg"));
        sensor.temp_scale = extractDoubleValue(objectContent, "temp_scale");
        sensor.humi_scale = extractDoubleValue(objectContent, "humi_scale");
        sensor.port_name = extractStringValue(objectContent, "port_name");

        sensors.push_back(sensor);
        objectStart = objectEnd + 1;
    }

    return sensors;
}

StorageType parseStorageType(const std::string& typeStr) {
    if (typeStr == "sqlite") return StorageType::SQLite;
    if (typeStr == "influxdb") return StorageType::InfluxDB;
    if (typeStr == "csv") return StorageType::CSV;
    if (typeStr == "none") return StorageType::None;
    return StorageType::SQLite;
}

} // namespace

AppConfig Config::load(const std::string& filename) {
    Config config;
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "无法打开配置文件: " << filename << std::endl;
        return Config::loadDefault();
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string jsonContent = buffer.str();

    AppConfig& appConfig = config.config_;

    appConfig.modbus.ports = extractPortArray(jsonContent);
    appConfig.modbus.read_interval = extractIntValue(jsonContent, "read_interval");
    appConfig.modbus.sensors = extractSensorArray(jsonContent);

    std::string storageTypeStr = extractStringValue(jsonContent, "storage_type");
    appConfig.storage.type = parseStorageType(storageTypeStr);
    appConfig.storage.sqlite_path = extractStringValue(jsonContent, "storage_sqlite_path");
    appConfig.storage.influxdb_url = extractStringValue(jsonContent, "storage_influxdb_url");
    appConfig.storage.influxdb_token = extractStringValue(jsonContent, "storage_influxdb_token");
    appConfig.storage.influxdb_org = extractStringValue(jsonContent, "storage_influxdb_org");
    appConfig.storage.influxdb_bucket = extractStringValue(jsonContent, "storage_influxdb_bucket");
    appConfig.storage.csv_path = extractStringValue(jsonContent, "storage_csv_path");

    config.applyDefaults();
    return appConfig;
}

AppConfig Config::loadDefault() {
    Config config;
    config.applyDefaults();
    return config.config_;
}

bool Config::exists(const std::string& filename) {
    std::ifstream file(filename);
    return file.is_open();
}

void Config::applyDefaults() {
    AppConfig& cfg = config_;

    if (cfg.modbus.ports.empty()) {
        PortConfig defaultPort;
#ifdef _WIN32
        defaultPort.name = "COM1";
        defaultPort.port = "COM1";
#else
        defaultPort.name = "ttyUSB0";
        defaultPort.port = "/dev/ttyUSB0";
#endif
        defaultPort.baudrate = 9600;
        defaultPort.data_bits = 8;
        defaultPort.stop_bits = 1;
        defaultPort.parity = 'N';
        defaultPort.timeout = 1.0;
        cfg.modbus.ports.push_back(defaultPort);
    }

    if (cfg.modbus.read_interval == 0) cfg.modbus.read_interval = 2;

    for (auto& sensor : cfg.modbus.sensors) {
        if (sensor.temp_scale == 0.0) sensor.temp_scale = 0.1;
        if (sensor.humi_scale == 0.0) sensor.humi_scale = 0.1;
        if (sensor.port_name.empty() && !cfg.modbus.ports.empty()) {
            sensor.port_name = cfg.modbus.ports[0].name;
        }
    }

    if (cfg.storage.type == StorageType::None) {
        cfg.storage.type = StorageType::SQLite;
    }
    if (cfg.storage.sqlite_path.empty()) {
        cfg.storage.sqlite_path = "sensor_data.db";
    }
    if (cfg.storage.csv_path.empty()) {
        cfg.storage.csv_path = "sensor_data.csv";
    }
    if (cfg.storage.influxdb_url.empty()) {
        cfg.storage.influxdb_url = "http://localhost:8086";
    }
}

void Config::print() const {
    const AppConfig& cfg = config_;

    std::cout << "配置信息:" << std::endl;
    std::cout << "  串口数量: " << cfg.modbus.ports.size() << std::endl;

    for (size_t i = 0; i < cfg.modbus.ports.size(); ++i) {
        const auto& port = cfg.modbus.ports[i];
        std::cout << "  串口" << (i + 1) << ": " << port.name << std::endl;
        std::cout << "    端口: " << port.port << std::endl;
        std::cout << "    波特率: " << port.baudrate << std::endl;
        std::cout << "    数据位: " << port.data_bits << std::endl;
        std::cout << "    停止位: " << port.stop_bits << std::endl;
        std::cout << "    校验位: " << port.parity << std::endl;
        std::cout << "    超时: " << port.timeout << "秒" << std::endl;
    }

    std::cout << "  读取间隔: " << cfg.modbus.read_interval << "秒" << std::endl;

    std::cout << "  存储类型: ";
    switch (cfg.storage.type) {
        case StorageType::SQLite: std::cout << "SQLite"; break;
        case StorageType::InfluxDB: std::cout << "InfluxDB"; break;
        case StorageType::CSV: std::cout << "CSV"; break;
        case StorageType::None: std::cout << "None"; break;
    }
    std::cout << std::endl;

    std::cout << "  传感器数量: " << cfg.modbus.sensors.size() << std::endl;

    for (size_t i = 0; i < cfg.modbus.sensors.size(); ++i) {
        const auto& sensor = cfg.modbus.sensors[i];
        std::cout << "  传感器" << (i + 1) << ": " << sensor.name
                  << " (从站地址: " << static_cast<int>(sensor.slave_id)
                  << ", 温度寄存器: 0x" << std::hex << sensor.temp_reg
                  << ", 湿度寄存器: 0x" << sensor.humi_reg << std::dec << ")" << std::endl;
    }
}

std::chrono::milliseconds Config::getTimeout() const {
    return std::chrono::milliseconds(static_cast<long long>(config_.modbus.timeout * 1000));
}

std::chrono::seconds Config::getReadInterval() const {
    return std::chrono::seconds(config_.modbus.read_interval);
}
