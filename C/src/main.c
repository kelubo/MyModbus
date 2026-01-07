#include "sensor_reader.h"
#include "data_storage.h"
#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
    #include <windows.h>
    #define SLEEP_MS(ms) Sleep(ms)
#else
    #include <unistd.h>
    #define SLEEP_MS(ms) usleep((ms) * 1000)
#endif

volatile int keep_running = 1;

#ifdef _WIN32
BOOL WINAPI console_handler(DWORD ctrl_type) {
    if (ctrl_type == CTRL_C_EVENT) {
        keep_running = 0;
        return TRUE;
    }
    return FALSE;
}
#else
void console_handler(int sig) {
    (void)sig;
    keep_running = 0;
}
#endif

void get_current_time(char* buffer, size_t size) {
    time_t now = time(NULL);
    struct tm* tm_info = localtime(&now);
    strftime(buffer, size, "%Y-%m-%d %H:%M:%S", tm_info);
}

void save_sensor_data(DataStorage* storage, const SensorData* results, int count, const SensorConfig* sensors) {
    if (!storage || !results || !sensors) return;

    for (int i = 0; i < count; i++) {
        if (!results[i].error) {
            SensorRecord record;
            strncpy(record.sensor_name, sensors[i].name, sizeof(record.sensor_name) - 1);
            record.sensor_name[sizeof(record.sensor_name) - 1] = '\0';
            record.slave_id = sensors[i].slave_id;
            record.temperature = results[i].temperature;
            record.humidity = results[i].humidity;
            record.timestamp = time(NULL);

            storage->ops->save(storage, &record);
        }
    }
}

int main(void) {
    AppConfig* config = config_create();
    if (!config) {
        fprintf(stderr, "错误: 无法创建配置\n");
        return 1;
    }

    bool config_loaded = false;
    if (file_exists(CONFIG_FILE_NAME)) {
        printf("正在加载配置文件: %s\n", CONFIG_FILE_NAME);
        config_loaded = config_load(config, CONFIG_FILE_NAME);
        if (!config_loaded) {
            fprintf(stderr, "警告: 加载配置文件失败，使用默认配置\n");
            config_load_default(config);
        }
    } else {
        printf("配置文件 %s 不存在，使用默认配置\n", CONFIG_FILE_NAME);
        config_load_default(config);
    }

    config_print(config);

#ifdef _WIN32
    if (!SetConsoleCtrlHandler(console_handler, TRUE)) {
        fprintf(stderr, "警告: 无法设置Ctrl+C处理器\n");
    }
#else
    signal(SIGINT, console_handler);
    signal(SIGTERM, console_handler);
#endif

    printf("\n正在初始化Modbus连接...\n");

    MultiPortReader* mreader = multi_port_reader_create();
    if (!mreader) {
        fprintf(stderr, "错误: 无法创建多串口读取器\n");
        config_free(config);
        return 1;
    }

    for (int i = 0; i < config->modbus.port_count; i++) {
        ModbusSensorReader* reader = modbus_reader_create(
            config->modbus.ports[i].port,
            config->modbus.ports[i].baudrate,
            config->modbus.ports[i].data_bits,
            config->modbus.ports[i].stop_bits,
            config->modbus.ports[i].parity,
            config->modbus.ports[i].timeout
        );
        if (!reader) {
            fprintf(stderr, "错误: 无法创建串口 %s 的Modbus读取器\n", config->modbus.ports[i].name);
            continue;
        }
        mreader->ports[mreader->port_count++] = reader;
    }

    if (mreader->port_count == 0) {
        fprintf(stderr, "错误: 没有可用的串口连接\n");
        multi_port_reader_free(mreader);
        config_free(config);
        return 1;
    }

    if (!multi_port_reader_connect_all(mreader)) {
        fprintf(stderr, "错误: 无法连接到所有串口\n");
        multi_port_reader_free(mreader);
        config_free(config);
        return 1;
    }

    printf("成功连接到 %d 个串口\n", mreader->port_count);
    printf("已配置 %d 个传感器\n", config->modbus.sensor_count);
    printf("开始读取温湿度数据...\n");
    printf("按 Ctrl+C 退出程序\n");
    printf("\n");

    StorageConfig storage_config;
    memset(&storage_config, 0, sizeof(storage_config));
    storage_config.type = config->storage.type;
    storage_config.enable_cache = config->storage.enable_cache;
    
    switch (storage_config.type) {
        case STORAGE_TYPE_SQLITE:
            strncpy(storage_config.config.sqlite.db_path, config->storage.sqlite.db_path, sizeof(storage_config.config.sqlite.db_path) - 1);
            break;
        case STORAGE_TYPE_INFLUXDB:
            strncpy(storage_config.config.influxdb.url, config->storage.influxdb.url, sizeof(storage_config.config.influxdb.url) - 1);
            strncpy(storage_config.config.influxdb.token, config->storage.influxdb.token, sizeof(storage_config.config.influxdb.token) - 1);
            strncpy(storage_config.config.influxdb.org, config->storage.influxdb.org, sizeof(storage_config.config.influxdb.org) - 1);
            strncpy(storage_config.config.influxdb.bucket, config->storage.influxdb.bucket, sizeof(storage_config.config.influxdb.bucket) - 1);
            break;
        case STORAGE_TYPE_CSV:
            strncpy(storage_config.config.csv.file_path, config->storage.csv.file_path, sizeof(storage_config.config.csv.file_path) - 1);
            break;
    }
    
    strncpy(storage_config.cache.cache_db_path, config->storage.cache.cache_db_path, sizeof(storage_config.cache.cache_db_path) - 1);
    storage_config.cache.flush_interval = config->storage.cache.flush_interval;
    storage_config.cache.batch_size = config->storage.cache.batch_size;

    DataStorage* storage = storage_create(&storage_config);
    if (storage) {
        printf("数据存储已启用: %s\n", storage_type_to_string(storage_config.type));
    } else {
        printf("数据存储已禁用\n");
    }

    SensorData* results = (SensorData*)malloc(config->modbus.sensor_count * sizeof(SensorData));
    if (!results) {
        fprintf(stderr, "错误: 内存分配失败\n");
        multi_port_reader_free(mreader);
        config_free(config);
        return 1;
    }

    while (keep_running) {
        char time_buffer[64];
        get_current_time(time_buffer, sizeof(time_buffer));
        printf("[%s]\n", time_buffer);

        multi_port_reader_read_sensors(mreader, config->modbus.sensors, config->modbus.sensor_count, results);
        print_sensor_data(results, config->modbus.sensor_count);
        save_sensor_data(storage, results, config->modbus.sensor_count, config->modbus.sensors);

        SLEEP_MS(config->modbus.read_interval * 1000);
    }

    printf("\n正在关闭连接...\n");
    free(results);
    multi_port_reader_free(mreader);
    storage_free(storage);
    config_free(config);
    printf("已关闭设备连接和存储\n");

    return 0;
}
