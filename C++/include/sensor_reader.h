#ifndef SENSOR_READER_H
#define SENSOR_READER_H

#include <string>
#include <vector>
#include <cstdint>
#include <memory>
#include <functional>

struct SensorData {
    std::string name;
    uint8_t slave_id;
    bool error;
    double temperature;
    double humidity;
    std::string error_message;
};

class SensorReader {
public:
    SensorReader(const std::string& port, int baudrate, int dataBits,
                 int stopBits, char parity, int timeoutMs);
    ~SensorReader();

    bool connect();
    void disconnect();
    bool isConnected() const;

    SensorData readSensor(uint8_t slaveId, uint16_t tempReg,
                          uint16_t humiReg, double tempScale,
                          double humiScale, const std::string& sensorName);
    std::vector<SensorData> readAllSensors(
        const std::vector<std::tuple<uint8_t, uint16_t, uint16_t, double, double, std::string>>& sensors);

    static std::string getDefaultPort();

private:
    class Impl;
    std::unique_ptr<Impl> impl_;
};

class MultiPortReader {
public:
    MultiPortReader();
    ~MultiPortReader();

    bool addPort(const std::string& name, const std::string& port, int baudrate,
                 int dataBits, int stopBits, char parity, int timeoutMs);
    bool connectAll();
    void disconnectAll();
    std::vector<SensorData> readAllSensors(
        const std::vector<std::tuple<uint8_t, uint16_t, uint16_t, double, double, std::string, std::string>>& sensors);
    bool isPortConnected(const std::string& portName) const;

private:
    std::vector<std::unique_ptr<SensorReader>> readers_;
    std::vector<std::string> portNames_;
};

#endif
