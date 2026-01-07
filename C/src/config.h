#ifndef CONFIG_H
#define CONFIG_H

#include <stdint.h>
#include <stdbool.h>

#define MAX_SENSORS 32
#define MAX_PORTS 16
#define CONFIG_FILE_NAME "config.json"

typedef struct {
    char name[64];
    char port[64];
    int baudrate;
    int data_bits;
    int stop_bits;
    char parity;
    float timeout;
} PortConfig;

typedef struct {
    char name[64];
    char port_name[64];
    uint8_t slave_id;
    uint16_t temp_register;
    uint16_t humi_register;
    float temp_scale;
    float humi_scale;
} SensorConfig;

typedef struct {
    int port_count;
    PortConfig ports[MAX_PORTS];
    int sensor_count;
    SensorConfig sensors[MAX_SENSORS];
    int read_interval;
} ModbusConfig;

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

typedef struct {
    ModbusConfig modbus;
    StorageConfig storage;
    bool config_loaded;
} AppConfig;

AppConfig* config_create(void);
void config_free(AppConfig* config);
bool config_load(AppConfig* config, const char* filename);
bool config_load_default(AppConfig* config);
bool file_exists(const char* filename);
void config_print(const AppConfig* config);
const char* storage_type_to_string(StorageType type);
StorageType string_to_storage_type(const char* str);

#endif
