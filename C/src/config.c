#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#ifdef _WIN32
    #include <windows.h>
#else
    #include <unistd.h>
#endif

typedef struct {
    char* start;
    char* end;
    size_t size;
} JSONBuffer;

static void trim_whitespace(char* str) {
    char* end;
    while (*str == ' ' || *str == '\t' || *str == '\n' || *str == '\r') str++;
    end = str + strlen(str) - 1;
    while (end > str && (*end == ' ' || *end == '\t' || *end == '\n' || *end == '\r')) end--;
    end[1] = '\0';
}

static char* read_file(const char* filename) {
    FILE* file = fopen(filename, "r");
    if (!file) {
        fprintf(stderr, "无法打开配置文件: %s\n", filename);
        return NULL;
    }

    fseek(file, 0, SEEK_END);
    long size = ftell(file);
    fseek(file, 0, SEEK_SET);

    char* content = (char*)malloc(size + 1);
    if (!content) {
        fclose(file);
        return NULL;
    }

    size_t read_size = fread(content, 1, size, file);
    content[read_size] = '\0';
    fclose(file);

    return content;
}

bool file_exists(const char* filename) {
    FILE* file = fopen(filename, "r");
    if (file) {
        fclose(file);
        return true;
    }
    return false;
}

static char* json_extract_string(const char* json, const char* key) {
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\"", key);

    char* key_pos = strstr(json, search_key);
    if (!key_pos) return NULL;

    char* colon_pos = strstr(key_pos, ":");
    if (!colon_pos) return NULL;

    char* value_start = colon_pos + 1;
    while (*value_start == ' ' || *value_start == '\t') value_start++;

    if (*value_start != '"') return NULL;
    value_start++;

    char* value_end = value_start;
    while (*value_end != '"' && *value_end != '\0') {
        if (*value_end == '\\' && value_end[1] != '\0') value_end += 2;
        else value_end++;
    }

    size_t value_len = value_end - value_start;
    char* value = (char*)malloc(value_len + 1);
    if (!value) return NULL;

    memcpy(value, value_start, value_len);
    value[value_len] = '\0';

    return value;
}

static int json_extract_int(const char* json, const char* key) {
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\"", key);

    char* key_pos = strstr(json, search_key);
    if (!key_pos) return 0;

    char* colon_pos = strstr(key_pos, ":");
    if (!colon_pos) return 0;

    char* value_start = colon_pos + 1;
    while (*value_start == ' ' || *value_start == '\t') value_start++;

    return atoi(value_start);
}

static float json_extract_float(const char* json, const char* key) {
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\"", key);

    char* key_pos = strstr(json, search_key);
    if (!key_pos) return 0.0f;

    char* colon_pos = strstr(key_pos, ":");
    if (!colon_pos) return 0.0f;

    char* value_start = colon_pos + 1;
    while (*value_start == ' ' || *value_start == '\t') value_start++;

    return (float)atof(value_start);
}

static int json_extract_array_size(const char* json, const char* key) {
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\"", key);

    char* key_pos = strstr(json, search_key);
    if (!key_pos) return 0;

    char* bracket_start = strstr(key_pos, "[");
    if (!bracket_start) return 0;

    int count = 0;
    char* p = bracket_start + 1;
    int depth = 1;

    while (*p && depth > 0) {
        if (*p == '[') depth++;
        else if (*p == ']') {
            depth--;
            if (depth == 0) break;
        }
        else if (*p == '{' && depth == 1) count++;
        p++;
    }

    return count;
}

static void json_extract_port(const char* array_start, int index, PortConfig* port) {
    char* obj_start = (char*)array_start;
    int current_obj = 0;
    int depth = 0;
    bool in_object = false;

    for (int i = 0; i <= index; i++) {
        obj_start = strchr(obj_start, '{');
        if (!obj_start) break;

        char* obj_end = obj_start + 1;
        depth = 0;
        in_object = false;

        while (*obj_end && depth >= 0) {
            if (*obj_end == '{' && !in_object) {
                in_object = true;
                depth = 1;
            } else if (*obj_end == '{') {
                depth++;
            } else if (*obj_end == '}') {
                depth--;
                if (depth == 0 && in_object) break;
            }
            obj_end++;
        }

        if (i == index && in_object && depth == 0) {
            size_t obj_len = obj_end - obj_start + 1;
            char* obj_str = (char*)malloc(obj_len + 1);
            memcpy(obj_str, obj_start, obj_len);
            obj_str[obj_len] = '\0';

            char* name = json_extract_string(obj_str, "name");
            if (name) {
                strncpy(port->name, name, sizeof(port->name) - 1);
                port->name[sizeof(port->name) - 1] = '\0';
                free(name);
            }

            char* port_str = json_extract_string(obj_str, "port");
            if (port_str) {
                strncpy(port->port, port_str, sizeof(port->port) - 1);
                port->port[sizeof(port->port) - 1] = '\0';
                free(port_str);
            }

            port->baudrate = json_extract_int(obj_str, "baudrate");
            port->data_bits = json_extract_int(obj_str, "data_bits");
            port->stop_bits = json_extract_int(obj_str, "stop_bits");

            char* parity_str = json_extract_string(obj_str, "parity");
            if (parity_str) {
                port->parity = parity_str[0];
                free(parity_str);
            } else {
                port->parity = 'N';
            }

            port->timeout = json_extract_float(obj_str, "timeout");
            if (port->timeout <= 0) port->timeout = 1.0f;

            free(obj_str);
            break;
        }

        obj_start = obj_end;
    }
}

static void json_extract_sensor(const char* array_start, int index, SensorConfig* sensor) {
    char* obj_start = (char*)array_start;
    int current_obj = 0;
    int depth = 0;
    bool in_object = false;

    for (int i = 0; i <= index; i++) {
        obj_start = strchr(obj_start, '{');
        if (!obj_start) break;

        char* obj_end = obj_start + 1;
        depth = 0;
        in_object = false;

        while (*obj_end && depth >= 0) {
            if (*obj_end == '{' && !in_object) {
                in_object = true;
                depth = 1;
            } else if (*obj_end == '{') {
                depth++;
            } else if (*obj_end == '}') {
                depth--;
                if (depth == 0 && in_object) break;
            }
            obj_end++;
        }

        if (i == index && in_object && depth == 0) {
            size_t obj_len = obj_end - obj_start + 1;
            char* obj_str = (char*)malloc(obj_len + 1);
            memcpy(obj_str, obj_start, obj_len);
            obj_str[obj_len] = '\0';

            char* name = json_extract_string(obj_str, "name");
            if (name) {
                strncpy(sensor->name, name, sizeof(sensor->name) - 1);
                sensor->name[sizeof(sensor->name) - 1] = '\0';
                free(name);
            }

            char* port_name = json_extract_string(obj_str, "port");
            if (port_name) {
                strncpy(sensor->port_name, port_name, sizeof(sensor->port_name) - 1);
                sensor->port_name[sizeof(sensor->port_name) - 1] = '\0';
                free(port_name);
            }

            sensor->slave_id = (uint8_t)json_extract_int(obj_str, "slave_id");
            sensor->temp_register = (uint16_t)json_extract_int(obj_str, "temp_reg");
            sensor->humi_register = (uint16_t)json_extract_int(obj_str, "humi_reg");
            sensor->temp_scale = json_extract_float(obj_str, "temp_scale");
            sensor->humi_scale = json_extract_float(obj_str, "humi_scale");

            free(obj_str);
            break;
        }

        obj_start = obj_end;
    }
}

AppConfig* config_create(void) {
    AppConfig* config = (AppConfig*)malloc(sizeof(AppConfig));
    if (!config) return NULL;

    memset(config, 0, sizeof(AppConfig));
    config->config_loaded = false;

    return config;
}

void config_free(AppConfig* config) {
    if (config) {
        free(config);
    }
}

bool config_load(AppConfig* config, const char* filename) {
    char* json_content = read_file(filename);
    if (!json_content) {
        return false;
    }

    char* ports_array_pos = strstr(json_content, "\"ports\"");
    if (ports_array_pos) {
        char* bracket = strstr(ports_array_pos, "[");
        if (bracket) {
            config->modbus.port_count = json_extract_array_size(json_content, "ports");
            if (config->modbus.port_count > MAX_PORTS) {
                config->modbus.port_count = MAX_PORTS;
            }
            for (int i = 0; i < config->modbus.port_count; i++) {
                json_extract_port(bracket, i, &config->modbus.ports[i]);
            }
        }
    } else {
        config->modbus.port_count = 1;
#ifdef _WIN32
        strncpy(config->modbus.ports[0].name, "默认串口", sizeof(config->modbus.ports[0].name) - 1);
        strncpy(config->modbus.ports[0].port, "COM3", sizeof(config->modbus.ports[0].port) - 1);
#else
        strncpy(config->modbus.ports[0].name, "默认串口", sizeof(config->modbus.ports[0].name) - 1);
        strncpy(config->modbus.ports[0].port, "/dev/ttyUSB0", sizeof(config->modbus.ports[0].port) - 1);
#endif
        config->modbus.ports[0].baudrate = 9600;
        config->modbus.ports[0].data_bits = 8;
        config->modbus.ports[0].stop_bits = 1;
        config->modbus.ports[0].parity = 'N';
        config->modbus.ports[0].timeout = 1.0f;
    }

    config->modbus.read_interval = json_extract_int(json_content, "read_interval");
    if (config->modbus.read_interval <= 0) {
        config->modbus.read_interval = 2;
    }

    char* storage_type_str = json_extract_string(json_content, "storage_type");
    if (storage_type_str) {
        config->storage.type = string_to_storage_type(storage_type_str);
        free(storage_type_str);
    } else {
        config->storage.type = STORAGE_TYPE_SQLITE;
    }

    char* db_path = json_extract_string(json_content, "storage_sqlite_path");
    if (db_path) {
        strncpy(config->storage.sqlite.db_path, db_path, sizeof(config->storage.sqlite.db_path) - 1);
        free(db_path);
    }

    char* influxdb_url = json_extract_string(json_content, "storage_influxdb_url");
    if (influxdb_url) {
        strncpy(config->storage.influxdb.url, influxdb_url, sizeof(config->storage.influxdb.url) - 1);
        free(influxdb_url);
    }

    char* influxdb_token = json_extract_string(json_content, "storage_influxdb_token");
    if (influxdb_token) {
        strncpy(config->storage.influxdb.token, influxdb_token, sizeof(config->storage.influxdb.token) - 1);
        free(influxdb_token);
    }

    char* influxdb_org = json_extract_string(json_content, "storage_influxdb_org");
    if (influxdb_org) {
        strncpy(config->storage.influxdb.org, influxdb_org, sizeof(config->storage.influxdb.org) - 1);
        free(influxdb_org);
    }

    char* influxdb_bucket = json_extract_string(json_content, "storage_influxdb_bucket");
    if (influxdb_bucket) {
        strncpy(config->storage.influxdb.bucket, influxdb_bucket, sizeof(config->storage.influxdb.bucket) - 1);
        free(influxdb_bucket);
    }

    char* csv_path = json_extract_string(json_content, "storage_csv_path");
    if (csv_path) {
        strncpy(config->storage.csv.file_path, csv_path, sizeof(config->storage.csv.file_path) - 1);
        free(csv_path);
    }
    
    // 加载缓存配置
    config->storage.enable_cache = true;
    char* cache_db_path = json_extract_string(json_content, "cache_db_path");
    if (cache_db_path) {
        strncpy(config->storage.cache.cache_db_path, cache_db_path, sizeof(config->storage.cache.cache_db_path) - 1);
        free(cache_db_path);
    }
    config->storage.cache.flush_interval = json_extract_int(json_content, "cache_flush_interval");
    if (config->storage.cache.flush_interval <= 0) {
        config->storage.cache.flush_interval = 10;
    }
    config->storage.cache.batch_size = json_extract_int(json_content, "cache_batch_size");
    if (config->storage.cache.batch_size <= 0) {
        config->storage.cache.batch_size = 100;
    }

    char* sensors_array_pos = strstr(json_content, "\"sensors\"");
    if (sensors_array_pos) {
        char* bracket = strstr(sensors_array_pos, "[");
        if (bracket) {
            config->modbus.sensor_count = json_extract_array_size(json_content, "sensors");
            if (config->modbus.sensor_count > MAX_SENSORS) {
                config->modbus.sensor_count = MAX_SENSORS;
            }
            for (int i = 0; i < config->modbus.sensor_count; i++) {
                json_extract_sensor(bracket, i, &config->modbus.sensors[i]);
            }
        }
    }

    free(json_content);
    config->config_loaded = true;

    return true;
}

bool config_load_default(AppConfig* config) {
    memset(config, 0, sizeof(AppConfig));

    config->modbus.port_count = 1;
#ifdef _WIN32
    strncpy(config->modbus.ports[0].name, "默认串口", sizeof(config->modbus.ports[0].name) - 1);
    strncpy(config->modbus.ports[0].port, "COM3", sizeof(config->modbus.ports[0].port) - 1);
#else
    strncpy(config->modbus.ports[0].name, "默认串口", sizeof(config->modbus.ports[0].name) - 1);
    strncpy(config->modbus.ports[0].port, "/dev/ttyUSB0", sizeof(config->modbus.ports[0].port) - 1);
#endif
    config->modbus.ports[0].baudrate = 9600;
    config->modbus.ports[0].data_bits = 8;
    config->modbus.ports[0].stop_bits = 1;
    config->modbus.ports[0].parity = 'N';
    config->modbus.ports[0].timeout = 1.0f;

    config->modbus.read_interval = 2;
    config->modbus.sensor_count = 3;

    strncpy(config->modbus.sensors[0].name, "传感器1", sizeof(config->modbus.sensors[0].name) - 1);
    strncpy(config->modbus.sensors[0].port_name, "默认串口", sizeof(config->modbus.sensors[0].port_name) - 1);
    config->modbus.sensors[0].slave_id = 1;
    config->modbus.sensors[0].temp_register = 0x0000;
    config->modbus.sensors[0].humi_register = 0x0001;
    config->modbus.sensors[0].temp_scale = 0.1f;
    config->modbus.sensors[0].humi_scale = 0.1f;

    strncpy(config->modbus.sensors[1].name, "传感器2", sizeof(config->modbus.sensors[1].name) - 1);
    strncpy(config->modbus.sensors[1].port_name, "默认串口", sizeof(config->modbus.sensors[1].port_name) - 1);
    config->modbus.sensors[1].slave_id = 2;
    config->modbus.sensors[1].temp_register = 0x0000;
    config->modbus.sensors[1].humi_register = 0x0001;
    config->modbus.sensors[1].temp_scale = 0.1f;
    config->modbus.sensors[1].humi_scale = 0.1f;

    strncpy(config->modbus.sensors[2].name, "传感器3", sizeof(config->modbus.sensors[2].name) - 1);
    strncpy(config->modbus.sensors[2].port_name, "默认串口", sizeof(config->modbus.sensors[2].port_name) - 1);
    config->modbus.sensors[2].slave_id = 3;
    config->modbus.sensors[2].temp_register = 0x0000;
    config->modbus.sensors[2].humi_register = 0x0001;
    config->modbus.sensors[2].temp_scale = 0.1f;
    config->modbus.sensors[2].humi_scale = 0.1f;

    config->storage.type = STORAGE_TYPE_SQLITE;
    strncpy(config->storage.sqlite.db_path, "sensor_data.db", sizeof(config->storage.sqlite.db_path) - 1);
    strncpy(config->storage.influxdb.url, "http://localhost:8086", sizeof(config->storage.influxdb.url) - 1);
    strncpy(config->storage.influxdb.token, "my-token", sizeof(config->storage.influxdb.token) - 1);
    strncpy(config->storage.influxdb.org, "my-org", sizeof(config->storage.influxdb.org) - 1);
    strncpy(config->storage.influxdb.bucket, "sensor-data", sizeof(config->storage.influxdb.bucket) - 1);
    strncpy(config->storage.csv.file_path, "sensor_data.csv", sizeof(config->storage.csv.file_path) - 1);
    
    // 设置默认缓存配置
    config->storage.enable_cache = true;
    strncpy(config->storage.cache.cache_db_path, "sensor_cache.db", sizeof(config->storage.cache.cache_db_path) - 1);
    config->storage.cache.flush_interval = 10;
    config->storage.cache.batch_size = 100;

    config->config_loaded = true;

    return true;
}

void config_print(const AppConfig* config) {
    printf("配置信息:\n");
    printf("  串口数量: %d\n", config->modbus.port_count);
    
    for (int i = 0; i < config->modbus.port_count; i++) {
        printf("  串口%d:\n", i + 1);
        printf("    名称: %s\n", config->modbus.ports[i].name);
        printf("    端口: %s\n", config->modbus.ports[i].port);
        printf("    波特率: %d\n", config->modbus.ports[i].baudrate);
        printf("    数据位: %d\n", config->modbus.ports[i].data_bits);
        printf("    停止位: %d\n", config->modbus.ports[i].stop_bits);
        printf("    校验位: %c\n", config->modbus.ports[i].parity);
        printf("    超时: %.1f秒\n", config->modbus.ports[i].timeout);
    }
    
    printf("  读取间隔: %d秒\n", config->modbus.read_interval);
    printf("  存储类型: %s\n", storage_type_to_string(config->storage.type));
    printf("  传感器数量: %d\n", config->modbus.sensor_count);

    for (int i = 0; i < config->modbus.sensor_count; i++) {
        printf("  传感器%d: %s (串口: %s, 从站地址: %d, 温度寄存器: 0x%04X, 湿度寄存器: 0x%04X)\n",
               i + 1,
               config->modbus.sensors[i].name,
               config->modbus.sensors[i].port_name,
               config->modbus.sensors[i].slave_id,
               config->modbus.sensors[i].temp_register,
               config->modbus.sensors[i].humi_register);
    }
}

const char* storage_type_to_string(StorageType type) {
    switch (type) {
        case STORAGE_TYPE_SQLITE: return "SQLite";
        case STORAGE_TYPE_INFLUXDB: return "InfluxDB";
        case STORAGE_TYPE_CSV: return "CSV";
        case STORAGE_TYPE_NONE: return "None";
        default: return "Unknown";
    }
}

StorageType string_to_storage_type(const char* str) {
    if (strcmp(str, "sqlite") == 0) return STORAGE_TYPE_SQLITE;
    if (strcmp(str, "influxdb") == 0) return STORAGE_TYPE_INFLUXDB;
    if (strcmp(str, "csv") == 0) return STORAGE_TYPE_CSV;
    if (strcmp(str, "none") == 0) return STORAGE_TYPE_NONE;
    return STORAGE_TYPE_SQLITE;
}
