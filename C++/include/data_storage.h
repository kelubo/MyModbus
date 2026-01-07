#ifndef DATA_STORAGE_H
#define DATA_STORAGE_H

#include <string>
#include <vector>
#include <chrono>
#include <memory>

struct SensorRecord {
    std::string sensor_name;
    int slave_id;
    double temperature;
    double humidity;
    std::chrono::system_clock::time_point timestamp;
};

class DataStorage {
public:
    virtual ~DataStorage() = default;
    virtual bool save(const SensorRecord& record) = 0;
    virtual bool saveBatch(const std::vector<SensorRecord>& records) = 0;
    virtual void close() = 0;
};

class StorageFactory {
public:
    static std::unique_ptr<DataStorage> create(StorageType type, const StorageConfig& config);
    static std::string storageTypeToString(StorageType type);
};

#endif
