#ifndef DATA_STORAGE_H
#define DATA_STORAGE_H

#include <stdint.h>
#include <stdbool.h>
#include <time.h>

typedef struct {
    char sensor_name[64];
    int slave_id;
    float temperature;
    float humidity;
    time_t timestamp;
} SensorRecord;

typedef struct DataStorage DataStorage;

typedef struct {
    bool (*save)(DataStorage* storage, const SensorRecord* record);
    bool (*save_batch)(DataStorage* storage, const SensorRecord* records, int count);
    void (*close)(DataStorage* storage);
} DataStorageOps;

struct DataStorage {
    DataStorageOps* ops;
    void* impl;
};

typedef enum {
    STORAGE_TYPE_SQLITE,
    STORAGE_TYPE_INFLUXDB,
    STORAGE_TYPE_CSV,
    STORAGE_TYPE_NONE
} StorageType;

typedef struct {
    char cache_db_path[256];
    int flush_interval;
    int batch_size;
} CacheConfig;

typedef struct {
    StorageType type;
    union {
        struct {
            char db_path[256];
        } sqlite;
        struct {
            char url[256];
            char token[256];
            char org[256];
            char bucket[256];
        } influxdb;
        struct {
            char file_path[256];
        } csv;
    } config;
    CacheConfig cache;
    bool enable_cache;
} StorageConfig;

DataStorage* storage_create(const StorageConfig* config);
void storage_free(DataStorage* storage);
StorageConfig get_default_storage_config(void);

#endif
