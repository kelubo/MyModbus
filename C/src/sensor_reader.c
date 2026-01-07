#include "sensor_reader.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
    #include <windows.h>
    #include "modbus.h"
#else
    #include <unistd.h>
    #include <modbus.h>
#endif

struct ModbusSensorReader {
    char name[64];
    char port[64];
    int baudrate;
    int data_bits;
    int stop_bits;
    char parity;
    float timeout;
    modbus_t* ctx;
};

struct MultiPortReader {
    int port_count;
    ModbusSensorReader* ports[16];
};

ModbusSensorReader* modbus_reader_create(const char* port, int baudrate, int data_bits, int stop_bits, char parity, float timeout) {
    ModbusSensorReader* reader = (ModbusSensorReader*)malloc(sizeof(ModbusSensorReader));
    if (!reader) return NULL;

    strncpy(reader->port, port, sizeof(reader->port) - 1);
    reader->port[sizeof(reader->port) - 1] = '\0';
    reader->baudrate = baudrate;
    reader->data_bits = data_bits;
    reader->stop_bits = stop_bits;
    reader->parity = parity;
    reader->timeout = timeout;
    reader->ctx = NULL;
    strncpy(reader->name, "默认串口", sizeof(reader->name) - 1);
    reader->name[sizeof(reader->name) - 1] = '\0';

    return reader;
}

bool modbus_reader_connect(ModbusSensorReader* reader) {
    if (!reader) return false;

    reader->ctx = modbus_new_rtu(
        reader->port,
        reader->baudrate,
        reader->parity,
        reader->data_bits,
        reader->stop_bits
    );

    if (!reader->ctx) {
        fprintf(stderr, "无法创建Modbus RTU上下文: %s\n", modbus_strerror(errno));
        return false;
    }

    modbus_set_debug(reader->ctx, FALSE);
    modbus_set_response_timeout(reader->ctx, (uint32_t)(reader->timeout * 1000000), 0);

    if (modbus_connect(reader->ctx) == -1) {
        fprintf(stderr, "连接失败: %s\n", modbus_strerror(errno));
        modbus_free(reader->ctx);
        reader->ctx = NULL;
        return false;
    }

    return true;
}

void modbus_reader_free(ModbusSensorReader* reader) {
    if (reader) {
        if (reader->ctx) {
            modbus_close(reader->ctx);
            modbus_free(reader->ctx);
        }
        free(reader);
    }
}

bool modbus_reader_read_sensor(ModbusSensorReader* reader, uint8_t slave_id, uint16_t temp_reg, uint16_t humi_reg, float temp_scale, float humi_scale, SensorData* result) {
    if (!reader || !reader->ctx || !result) return false;

    result->error = false;
    result->temperature = 0.0f;
    result->humidity = 0.0f;
    result->error_msg[0] = '\0';

    modbus_set_slave(reader->ctx, slave_id);

    uint16_t temp_data[1];
    int temp_rc = modbus_read_input_registers(reader->ctx, temp_reg, 1, temp_data);

    if (temp_rc == -1) {
        result->error = true;
        snprintf(result->error_msg, sizeof(result->error_msg), "读取温度失败: %s", modbus_strerror(errno));
        return false;
    }

    uint16_t humi_data[1];
    int humi_rc = modbus_read_input_registers(reader->ctx, humi_reg, 1, humi_data);

    if (humi_rc == -1) {
        result->error = true;
        snprintf(result->error_msg, sizeof(result->error_msg), "读取湿度失败: %s", modbus_strerror(errno));
        return false;
    }

    result->temperature = (float)temp_data[0] * temp_scale;
    result->humidity = (float)humi_data[0] * humi_scale;

    return true;
}

MultiPortReader* multi_port_reader_create(void) {
    MultiPortReader* mreader = (MultiPortReader*)malloc(sizeof(MultiPortReader));
    if (!mreader) return NULL;

    mreader->port_count = 0;
    for (int i = 0; i < 16; i++) {
        mreader->ports[i] = NULL;
    }

    return mreader;
}

bool multi_port_reader_add_port(MultiPortReader* mreader, const char* name, const char* port, int baudrate, int data_bits, int stop_bits, char parity, float timeout) {
    if (!mreader || mreader->port_count >= 16) return false;

    ModbusSensorReader* reader = modbus_reader_create(port, baudrate, data_bits, stop_bits, parity, timeout);
    if (!reader) return false;

    if (name) {
        strncpy(reader->name, name, sizeof(reader->name) - 1);
        reader->name[sizeof(reader->name) - 1] = '\0';
    }

    mreader->ports[mreader->port_count] = reader;
    mreader->port_count++;

    return true;
}

bool multi_port_reader_connect_all(MultiPortReader* mreader) {
    if (!mreader) return false;

    int success_count = 0;
    for (int i = 0; i < mreader->port_count; i++) {
        if (mreader->ports[i]) {
            if (modbus_reader_connect(mreader->ports[i])) {
                printf("成功连接到串口 %s: %s\n", mreader->ports[i]->name, mreader->ports[i]->port);
                success_count++;
            } else {
                printf("连接到串口 %s 失败: %s\n", mreader->ports[i]->name, mreader->ports[i]->port);
            }
        }
    }

    return success_count > 0;
}

void multi_port_reader_free(MultiPortReader* mreader) {
    if (mreader) {
        for (int i = 0; i < mreader->port_count; i++) {
            if (mreader->ports[i]) {
                modbus_reader_free(mreader->ports[i]);
            }
        }
        free(mreader);
    }
}

ModbusSensorReader* multi_port_reader_find_port(MultiPortReader* mreader, const char* port_name) {
    if (!mreader || !port_name) return NULL;

    for (int i = 0; i < mreader->port_count; i++) {
        if (mreader->ports[i] && strcmp(mreader->ports[i]->name, port_name) == 0) {
            return mreader->ports[i];
        }
    }

    return NULL;
}

void multi_port_reader_read_sensors(MultiPortReader* mreader, const SensorConfig* sensors, int sensor_count, SensorData* results) {
    if (!mreader || !sensors || !results) return;

    for (int i = 0; i < sensor_count; i++) {
        results[i].error = false;
        results[i].temperature = 0.0f;
        results[i].humidity = 0.0f;
        results[i].error_msg[0] = '\0';

        strncpy(results[i].name, sensors[i].name, sizeof(results[i].name) - 1);
        results[i].name[sizeof(results[i].name) - 1] = '\0';

        ModbusSensorReader* reader = multi_port_reader_find_port(mreader, sensors[i].port_name);
        if (!reader) {
            results[i].error = true;
            snprintf(results[i].error_msg, sizeof(results[i].error_msg), "未找到串口: %s", sensors[i].port_name);
            continue;
        }

        if (!reader->ctx) {
            results[i].error = true;
            snprintf(results[i].error_msg, sizeof(results[i].error_msg), "串口未连接: %s", sensors[i].port_name);
            continue;
        }

        if (!modbus_reader_read_sensor(reader, sensors[i].slave_id, sensors[i].temp_register, sensors[i].humi_register, sensors[i].temp_scale, sensors[i].humi_scale, &results[i])) {
            results[i].error = true;
        }
    }
}

void print_sensor_data(const SensorData* results, int count) {
    if (!results) return;

    for (int i = 0; i < count; i++) {
        if (results[i].error) {
            printf("  %s: 读取失败 - %s\n", results[i].name, results[i].error_msg);
        } else {
            printf("  %s: 温度=%.1f°C, 湿度=%.1f%%\n", results[i].name, results[i].temperature, results[i].humidity);
        }
    }
}
