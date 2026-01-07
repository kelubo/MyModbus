package com.modbus;

import com.modbus.config.AppConfig;
import com.modbus.config.ConfigLoader;
import com.modbus.config.ModbusConfig;
import com.modbus.config.PortConfig;
import com.modbus.data.SensorData;
import com.modbus.sensor.MultiPortReader;
import com.modbus.storage.SensorDataStorage;

import java.util.List;

public class Main {
    private static volatile boolean running = true;

    public static void main(String[] args) {
        System.out.println("Modbus温湿度传感器读取程序 (Java)");
        System.out.println("================================");

        String configFilename = "config.json";

        AppConfig config;
        if (!ConfigLoader.exists(configFilename)) {
            System.out.println("配置文件 " + configFilename + " 不存在，使用默认配置");
            config = ConfigLoader.loadDefault();
        } else {
            config = ConfigLoader.load(configFilename);
        }

        config.print();

        setupSignalHandler();

        MultiPortReader reader = new MultiPortReader();
        ModbusConfig modbusConfig = config.getModbus();
        List<PortConfig> ports = modbusConfig.getPorts();

        if (ports.isEmpty()) {
            System.err.println("错误: 配置中没有串口信息");
            System.exit(1);
        }

        for (PortConfig port : ports) {
            if (!reader.addPort(port)) {
                System.err.println("警告: 无法添加串口 " + port.getName());
            }
        }

        if (!reader.connectAll()) {
            System.err.println("错误: 无法连接任何串口");
            System.exit(1);
        }

        SensorDataStorage storage = new SensorDataStorage(
            config.getStorageType(),
            config.getStorageSqlitePath(),
            config.getStorageCsvPath(),
            config.getStorageInfluxdbUrl(),
            config.getStorageInfluxdbToken(),
            config.getStorageInfluxdbOrg(),
            config.getStorageInfluxdbBucket()
        );

        List<com.modbus.config.SensorConfig> sensors = modbusConfig.getSensors();

        if (sensors.isEmpty()) {
            System.err.println("错误: 配置中没有传感器信息");
            reader.close();
            storage.close();
            System.exit(1);
        }

        System.out.println("\n开始读取传感器数据...");

        try {
            while (running) {
                List<SensorData> dataList = reader.readAllSensors(sensors);

                for (SensorData data : dataList) {
                    if (data.isSuccess()) {
                        System.out.println(data.toString());
                        storage.save(data);
                    } else {
                        System.out.println("读取 " + data.getName() + " 失败: " + data.getError());
                    }
                }

                Thread.sleep(modbusConfig.getReadInterval() * 1000L);
            }
        } catch (InterruptedException e) {
            System.out.println("\n程序被中断");
        }

        System.out.println("\n正在关闭程序...");
        reader.close();
        storage.close();
        System.out.println("程序已退出");
    }

    private static void setupSignalHandler() {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            running = false;
            System.out.println("\n收到关闭信号，正在退出...");
        }));
    }
}
