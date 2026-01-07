package com.modbus.sensor;

import java.io.IOException;
import com.fazecast.jSerialComm.SerialPort;
import com.fazecast.jSerialComm.SerialPortDataListener;
import com.fazecast.jSerialComm.SerialPortEvent;

public class SensorReader {
    private SerialPort serialPort;
    private String portName;
    private int baudrate;
    private int dataBits;
    private int stopBits;
    private char parity;
    private int timeout;
    private byte[] readBuffer;
    private boolean isOpen;

    public SensorReader(String portName, int baudrate, int dataBits, int stopBits, char parity, int timeout) {
        this.portName = portName;
        this.baudrate = baudrate;
        this.dataBits = dataBits;
        this.stopBits = stopBits;
        this.parity = parity;
        this.timeout = timeout;
        this.readBuffer = new byte[256];
        this.isOpen = false;
    }

    public boolean open() {
        serialPort = SerialPort.getCommPort(portName);
        
        if (!serialPort.openPort()) {
            System.out.println("错误: 无法打开串口 " + portName);
            return false;
        }

        serialPort.setBaudRate(baudrate);
        serialPort.setNumDataBits(dataBits);
        serialPort.setNumStopBits(stopBits);
        
        switch (parity) {
            case 'O': case 'o': serialPort.setParity(SerialPort.ODD_PARITY); break;
            case 'E': case 'e': serialPort.setParity(SerialPort.EVEN_PARITY); break;
            default: serialPort.setParity(SerialPort.NO_PARITY); break;
        }
        
        serialPort.setComPortTimeouts(SerialPort.TIMEOUT_READ_SEMI_BLOCKING, timeout * 1000, 0);
        serialPort.setFlowControl(SerialPort.FLOW_CONTROL_DISABLED);
        
        serialPort.addDataListener(new SerialPortDataListener() {
            @Override
            public int getListeningEvents() { return SerialPort.LISTENING_EVENT_DATA_AVAILABLE; }
            
            @Override
            public void serialEvent(SerialPortEvent event) {
                if (event.getEventType() == SerialPort.LISTENING_EVENT_DATA_AVAILABLE) {
                    serialPort.readBytes(readBuffer, serialPort.bytesAvailable());
                }
            }
        });

        isOpen = true;
        System.out.println("串口 " + portName + " 已打开");
        return true;
    }

    public void close() {
        if (isOpen && serialPort != null) {
            serialPort.closePort();
            isOpen = false;
            System.out.println("串口已关闭");
        }
    }

    public boolean isOpen() {
        return isOpen;
    }

    public com.modbus.data.SensorData readSensorData(int slaveId, int tempReg, int humiReg,
                                                      double tempScale, double humiScale, String sensorName) {
        com.modbus.data.SensorData result = new com.modbus.data.SensorData();
        result.setName(sensorName);
        result.setSlaveId(slaveId);

        if (!isOpen) {
            result.setSuccess(false);
            result.setError("串口未打开");
            return result;
        }

        try {
            byte[] request = createModbusRequest(slaveId, tempReg, humiReg);
            
            if (!sendRequest(request)) {
                result.setSuccess(false);
                result.setError("发送请求失败");
                return result;
            }

            Thread.sleep(100);

            byte[] response = readResponse();

            if (response == null || response.length < 5) {
                result.setSuccess(false);
                result.setError("读取响应超时或数据不完整");
                return result;
            }

            if (!validateResponse(response, slaveId)) {
                result.setSuccess(false);
                result.setError("响应帧格式错误");
                return result;
            }

            int tempRaw = ((response[3] & 0xFF) << 8) | (response[4] & 0xFF);
            int humiRaw = ((response[5] & 0xFF) << 8) | (response[6] & 0xFF);

            result.setTemperature(tempRaw * tempScale);
            result.setHumidity(humiRaw * humiScale);
            result.setSuccess(true);

        } catch (Exception e) {
            result.setSuccess(false);
            result.setError("读取数据时发生错误: " + e.getMessage());
        }

        return result;
    }

    private byte[] createModbusRequest(int slaveId, int tempReg, int humiReg) {
        byte[] request = new byte[6];
        request[0] = (byte) slaveId;
        request[1] = 0x03;
        request[2] = (byte) ((tempReg >> 8) & 0xFF);
        request[3] = (byte) (tempReg & 0xFF);
        request[4] = 0x00;
        request[5] = 0x04;
        return request;
    }

    private int calculateCRC(byte[] data) {
        int crc = 0xFFFF;
        for (int i = 0; i < data.length; i++) {
            crc ^= (data[i] & 0xFF);
            for (int j = 0; j < 8; j++) {
                if ((crc & 0x0001) != 0) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc >>= 1;
                }
            }
        }
        return crc;
    }

    private boolean sendRequest(byte[] request) {
        int crc = calculateCRC(request);
        byte[] crcBytes = new byte[] {
            (byte) (crc & 0xFF),
            (byte) ((crc >> 8) & 0xFF)
        };
        
        byte[] fullRequest = new byte[request.length + 2];
        System.arraycopy(request, 0, fullRequest, 0, request.length);
        System.arraycopy(crcBytes, 0, fullRequest, request.length, 2);

        int bytesWritten = serialPort.writeBytes(fullRequest, fullRequest.length);
        return bytesWritten == fullRequest.length;
    }

    private byte[] readResponse() {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        int available = serialPort.bytesAvailable();
        if (available < 5) {
            return null;
        }

        byte[] response = new byte[available];
        int bytesRead = serialPort.readBytes(response, available);
        
        if (bytesRead < 5) {
            return null;
        }

        byte[] trimmed = new byte[bytesRead];
        System.arraycopy(response, 0, trimmed, 0, bytesRead);
        return trimmed;
    }

    private boolean validateResponse(byte[] response, int expectedSlaveId) {
        if (response.length < 5) {
            return false;
        }

        if ((response[0] & 0xFF) != expectedSlaveId) {
            return false;
        }

        if ((response[1] & 0xFF) != 0x03) {
            return false;
        }

        if ((response[2] & 0xFF) != 4) {
            return false;
        }

        int receivedCRC = ((response[response.length - 1] & 0xFF) << 8) | (response[response.length - 2] & 0xFF);
        byte[] dataWithoutCRC = new byte[response.length - 2];
        System.arraycopy(response, 0, dataWithoutCRC, 0, dataWithoutCRC.length);
        int calculatedCRC = calculateCRC(dataWithoutCRC);

        return receivedCRC == calculatedCRC;
    }

    public void destroy() {
        close();
    }
}
