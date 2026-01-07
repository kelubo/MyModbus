package com.modbus.config;

public class SensorConfig {
    private String name;
    private int slaveId;
    private int tempReg;
    private int humiReg;
    private double tempScale;
    private double humiScale;
    private String portName;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getSlaveId() {
        return slaveId;
    }

    public void setSlaveId(int slaveId) {
        this.slaveId = slaveId;
    }

    public int getTempReg() {
        return tempReg;
    }

    public void setTempReg(int tempReg) {
        this.tempReg = tempReg;
    }

    public int getHumiReg() {
        return humiReg;
    }

    public void setHumiReg(int humiReg) {
        this.humiReg = humiReg;
    }

    public double getTempScale() {
        return tempScale;
    }

    public void setTempScale(double tempScale) {
        this.tempScale = tempScale;
    }

    public double getHumiScale() {
        return humiScale;
    }

    public void setHumiScale(double humiScale) {
        this.humiScale = humiScale;
    }

    public String getPortName() {
        return portName;
    }

    public void setPortName(String portName) {
        this.portName = portName;
    }
}
