#ifndef SENSOR_READER_H
#define SENSOR_READER_H

#include <stdint.h>
#include <stdbool.h>

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
    char name[64];
    float temperature;
    float humidity;
    bool error;
    char error_msg[256];
} SensorData;

typedef struct ModbusSensorReader ModbusSensorReader;
typedef struct MultiPortReader MultiPortReader;

ModbusSensorReader* modbus_reader_create(const char* port, int baudrate, int data_bits, int stop_bits, char parity, float timeout);
bool modbus_reader_connect(ModbusSensorReader* reader);
void modbus_reader_free(ModbusSensorReader* reader);
bool modbus_reader_read_sensor(ModbusSensorReader* reader, uint8_t slave_id, uint16_t temp_reg, uint16_t humi_reg, float temp_scale, float humi_scale, SensorData* result);

MultiPortReader* multi_port_reader_create(void);
bool multi_port_reader_add_port(MultiPortReader* mreader, const char* name, const char* port, int baudrate, int data_bits, int stop_bits, char parity, float timeout);
bool multi_port_reader_connect_all(MultiPortReader* mreader);
void multi_port_reader_free(MultiPortReader* mreader);
void multi_port_reader_read_sensors(MultiPortReader* mreader, const SensorConfig* sensors, int sensor_count, SensorData* results);
void print_sensor_data(const SensorData* results, int count);

#endif
