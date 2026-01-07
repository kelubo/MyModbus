package com.modbus.config;

import java.util.ArrayList;
import java.util.List;

public class AppConfig {
    private ModbusConfig modbus;
    private StorageConfig storage;

    public AppConfig() {
        this.modbus = new ModbusConfig();
        this.storage = new StorageConfig();
    }

    public AppConfig loadDefault() {
        String os = System.getProperty("os.name").toLowerCase();
        
        PortConfig defaultPort = new PortConfig();
        if (os.contains("win")) {
            defaultPort.setName("COM1");
            defaultPort.setPort("COM1");
        } else {
            defaultPort.setName("ttyUSB0");
            defaultPort.setPort("/dev/ttyUSB0");
        }
        defaultPort.setBaudrate(9600);
        defaultPort.setDataBits(8);
        defaultPort.setStopBits(1);
        defaultPort.setParity("N");
        defaultPort.setTimeout(1.0);
        modbus.addPort(defaultPort);
        
        modbus.setReadInterval(2);
        
        storage.setType("sqlite");
        storage.setSqlitePath("sensor_data.db");
        storage.setCsvPath("sensor_data.csv");
        storage.setInfluxdbUrl("http://localhost:8086");
        storage.setInfluxdbToken("");
        storage.setInfluxdbOrg("");
        storage.setInfluxdbBucket("sensor-data");
        
        SensorConfig sensor1 = new SensorConfig();
        sensor1.setName("传感器1");
        sensor1.setSlaveId(1);
        sensor1.setTempReg(0);
        sensor1.setHumiReg(1);
        sensor1.setTempScale(0.1);
        sensor1.setHumiScale(0.1);
        sensor1.setPortName(defaultPort.getName());
        modbus.addSensor(sensor1);
        
        return this;
    }

    public void parseFromMap(java.util.Map<String, Object> data) {
        if (data.containsKey("ports") && data.get("ports") instanceof java.util.List) {
            @SuppressWarnings("unchecked")
            java.util.List<java.util.Map<String, Object>> portList = 
                (java.util.List<java.util.Map<String, Object>>) data.get("ports");
            
            for (java.util.Map<String, Object> portData : portList) {
                PortConfig port = new PortConfig();
                if (portData.containsKey("name")) {
                    port.setName((String) portData.get("name"));
                }
                if (portData.containsKey("port")) {
                    port.setPort((String) portData.get("port"));
                }
                if (portData.containsKey("baudrate")) {
                    port.setBaudrate(((Number) portData.get("baudrate")).intValue());
                }
                if (portData.containsKey("data_bits")) {
                    port.setDataBits(((Number) portData.get("data_bits")).intValue());
                }
                if (portData.containsKey("stop_bits")) {
                    port.setStopBits(((Number) portData.get("stop_bits")).intValue());
                }
                if (portData.containsKey("parity")) {
                    port.setParity((String) portData.get("parity"));
                }
                if (portData.containsKey("timeout")) {
                    port.setTimeout(((Number) portData.get("timeout")).doubleValue());
                }
                modbus.addPort(port);
            }
        }
        
        if (data.containsKey("read_interval")) {
            modbus.setReadInterval(((Number) data.get("read_interval")).intValue());
        }
        
        if (data.containsKey("storage_type")) {
            storage.setType((String) data.get("storage_type"));
        }
        if (data.containsKey("storage_sqlite_path")) {
            storage.setSqlitePath((String) data.get("storage_sqlite_path"));
        }
        if (data.containsKey("storage_influxdb_url")) {
            storage.setInfluxdbUrl((String) data.get("storage_influxdb_url"));
        }
        if (data.containsKey("storage_influxdb_token")) {
            storage.setInfluxdbToken((String) data.get("storage_influxdb_token"));
        }
        if (data.containsKey("storage_influxdb_org")) {
            storage.setInfluxdbOrg((String) data.get("storage_influxdb_org"));
        }
        if (data.containsKey("storage_influxdb_bucket")) {
            storage.setInfluxdbBucket((String) data.get("storage_influxdb_bucket"));
        }
        if (data.containsKey("storage_csv_path")) {
            storage.setCsvPath((String) data.get("storage_csv_path"));
        }
        
        if (data.containsKey("sensors") && data.get("sensors") instanceof java.util.List) {
            @SuppressWarnings("unchecked")
            java.util.List<java.util.Map<String, Object>> sensorList = 
                (java.util.List<java.util.Map<String, Object>>) data.get("sensors");
            
            for (java.util.Map<String, Object> sensorData : sensorList) {
                SensorConfig sensor = new SensorConfig();
                if (sensorData.containsKey("name")) {
                    sensor.setName((String) sensorData.get("name"));
                }
                if (sensorData.containsKey("slave_id")) {
                    sensor.setSlaveId(((Number) sensorData.get("slave_id")).intValue());
                }
                if (sensorData.containsKey("temp_reg")) {
                    sensor.setTempReg(((Number) sensorData.get("temp_reg")).intValue());
                }
                if (sensorData.containsKey("humi_reg")) {
                    sensor.setHumiReg(((Number) sensorData.get("humi_reg")).intValue());
                }
                if (sensorData.containsKey("temp_scale")) {
                    sensor.setTempScale(((Number) sensorData.get("temp_scale")).doubleValue());
                }
                if (sensorData.containsKey("humi_scale")) {
                    sensor.setHumiScale(((Number) sensorData.get("humi_scale")).doubleValue());
                }
                if (sensorData.containsKey("port_name")) {
                    sensor.setPortName((String) sensorData.get("port_name"));
                }
                modbus.addSensor(sensor);
            }
        }
        
        if (modbus.getPorts().isEmpty()) {
            loadDefault();
        }
    }

    public void print() {
        System.out.println("配置信息:");
        System.out.println("  串口数量: " + modbus.getPorts().size());
        
        for (int i = 0; i < modbus.getPorts().size(); i++) {
            PortConfig port = modbus.getPorts().get(i);
            System.out.println("  串口" + (i + 1) + ": " + port.getName());
            System.out.println("    端口: " + port.getPort());
            System.out.println("    波特率: " + port.getBaudrate());
            System.out.println("    数据位: " + port.getDataBits());
            System.out.println("    停止位: " + port.getStopBits());
            System.out.println("    校验位: " + port.getParity());
            System.out.println("    超时: " + port.getTimeout() + "秒");
        }
        
        System.out.println("  读取间隔: " + modbus.getReadInterval() + "秒");
        
        String typeStr = storage.getType();
        switch (storage.getType()) {
            case "sqlite": typeStr = "SQLite"; break;
            case "influxdb": typeStr = "InfluxDB"; break;
            case "csv": typeStr = "CSV"; break;
            case "none": typeStr = "None"; break;
        }
        System.out.println("  存储类型: " + typeStr);
        
        System.out.println("  传感器数量: " + modbus.getSensors().size());
        
        for (int i = 0; i < modbus.getSensors().size(); i++) {
            SensorConfig sensor = modbus.getSensors().get(i);
            System.out.printf("  传感器%d: %s (从站地址: %d, 温度寄存器: 0x%04X, 湿度寄存器: 0x%04X, 串口: %s)%n",
                i + 1, sensor.getName(), sensor.getSlaveId(), sensor.getTempReg(), sensor.getHumiReg(), sensor.getPortName());
        }
    }

    public ModbusConfig getModbus() {
        return modbus;
    }

    public void setModbus(ModbusConfig modbus) {
        this.modbus = modbus;
    }

    public StorageConfig getStorage() {
        return storage;
    }

    public void setStorage(StorageConfig storage) {
        this.storage = storage;
    }
}
