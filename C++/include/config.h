#include <string>
#include <vector>
#include <cstdint>
#include <chrono>
#include <functional>

#ifndef CONFIG_H
#define CONFIG_H

struct SensorConfig {
    std::string name;
    uint8_t slave_id;
    uint16_t temp_reg;
    uint16_t humi_reg;
    double temp_scale;
    double humi_scale;
    std::string port_name;
};

struct PortConfig {
    std::string name;
    std::string port;
    int baudrate;
    int data_bits;
    int stop_bits;
    char parity;
    double timeout;
};

struct ModbusConfig {
    std::vector<PortConfig> ports;
    int read_interval;
    std::vector<SensorConfig> sensors;
};

enum class StorageType {
    None,
    SQLite,
    InfluxDB,
    CSV
};

struct StorageConfig {
    StorageType type;
    std::string sqlite_path;
    std::string influxdb_url;
    std::string influxdb_token;
    std::string influxdb_org;
    std::string influxdb_bucket;
    std::string csv_path;
};

struct AppConfig {
    ModbusConfig modbus;
    StorageConfig storage;
};

class Config {
public:
    static AppConfig load(const std::string& filename);
    static AppConfig loadDefault();
    static bool exists(const std::string& filename);
    void print() const;
    std::chrono::milliseconds getTimeout() const;
    std::chrono::seconds getReadInterval() const;

private:
    AppConfig config_;
    void applyDefaults();
};

#endif
