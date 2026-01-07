package com.modbus.sensor;

import com.modbus.config.PortConfig;
import com.modbus.config.SensorConfig;
import com.modbus.data.SensorData;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MultiPortReader {
    private List<SensorReader> readers;
    private List<String> portNames;
    private Map<String, SensorReader> portMap;
    private boolean connected;

    public MultiPortReader() {
        this.readers = new ArrayList<>();
        this.portNames = new ArrayList<>();
        this.portMap = new HashMap<>();
        this.connected = false;
    }

    public boolean addPort(String name, String port, int baudrate, int dataBits,
                          int stopBits, char parity, int timeout) {
        if (readers.size() >= 16) {
            System.err.println("已达到最大串口数量限制 (16)");
            return false;
        }

        if (portMap.containsKey(name)) {
            System.err.println("串口名称已存在: " + name);
            return false;
        }

        SensorReader reader = new SensorReader(port, baudrate, dataBits, stopBits, parity, timeout);
        readers.add(reader);
        portNames.add(name);
        portMap.put(name, reader);

        System.out.println("已添加串口: " + name + " (" + port + ")");
        return true;
    }

    public boolean addPort(PortConfig config) {
        char parity = 'N';
        if (config.getParity() != null && !config.getParity().isEmpty()) {
            parity = config.getParity().charAt(0);
        }
        return addPort(config.getName(), config.getPort(), config.getBaudrate(),
                      config.getDataBits(), config.getStopBits(), parity,
                      (int) (config.getTimeout() * 1000));
    }

    public boolean connectAll() {
        if (readers.isEmpty()) {
            System.err.println("没有可连接的串口");
            return false;
        }

        int connected = 0;
        for (int i = 0; i < readers.size(); i++) {
            if (readers.get(i).open()) {
                connected++;
                System.out.println("已连接串口: " + portNames.get(i));
            } else {
                System.err.println("无法连接串口: " + portNames.get(i));
            }
        }

        connected = connected > 0;
        return connected;
    }

    public void disconnectAll() {
        for (SensorReader reader : readers) {
            if (reader.isOpen()) {
                reader.close();
            }
        }
        connected = false;
        System.out.println("已断开所有串口连接");
    }

    public boolean isConnected() {
        return connected;
    }

    public boolean isPortConnected(String portName) {
        SensorReader reader = portMap.get(portName);
        return reader != null && reader.isOpen();
    }

    public List<SensorData> readAllSensors(List<SensorConfig> sensors) {
        List<SensorData> results = new ArrayList<>();

        for (SensorConfig sensor : sensors) {
            String portName = sensor.getPortName();
            SensorReader reader = portMap.get(portName);

            if (reader == null) {
                SensorData errorData = new SensorData();
                errorData.setName(sensor.getName());
                errorData.setSuccess(false);
                errorData.setError("未找到串口: " + portName);
                results.add(errorData);
                continue;
            }

            if (!reader.isOpen()) {
                SensorData errorData = new SensorData();
                errorData.setName(sensor.getName());
                errorData.setSuccess(false);
                errorData.setError("串口未打开: " + portName);
                results.add(errorData);
                continue;
            }

            SensorData data = reader.readSensorData(
                sensor.getSlaveId(),
                sensor.getTempReg(),
                sensor.getHumiReg(),
                sensor.getTempScale(),
                sensor.getHumiScale(),
                sensor.getName()
            );

            results.add(data);
        }

        return results;
    }

    public int getPortCount() {
        return readers.size();
    }

    public String getPortName(int index) {
        if (index >= 0 && index < portNames.size()) {
            return portNames.get(index);
        }
        return null;
    }

    public void close() {
        disconnectAll();
    }
}
