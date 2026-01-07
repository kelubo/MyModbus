package com.modbus.config;

import java.util.List;
import java.util.ArrayList;

public class ModbusConfig {
    private List<PortConfig> ports;
    private int readInterval;
    private List<SensorConfig> sensors;

    public ModbusConfig() {
        this.ports = new ArrayList<>();
        this.sensors = new ArrayList<>();
    }

    public List<PortConfig> getPorts() {
        return ports;
    }

    public void setPorts(List<PortConfig> ports) {
        this.ports = ports;
    }

    public void addPort(PortConfig port) {
        this.ports.add(port);
    }

    public int getReadInterval() {
        return readInterval;
    }

    public void setReadInterval(int readInterval) {
        this.readInterval = readInterval;
    }

    public List<SensorConfig> getSensors() {
        return sensors;
    }

    public void setSensors(List<SensorConfig> sensors) {
        this.sensors = sensors;
    }

    public void addSensor(SensorConfig sensor) {
        this.sensors.add(sensor);
    }
}
