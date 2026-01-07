package main

import (
	"fmt"
	"log"
	"time"

	"github.com/goburrow/modbus"
)

type SensorData struct {
	Name        string
	Temperature float64
	Humidity    float64
	Error       error
}

type ModbusSensorReader struct {
	port     string
	baudrate int
	dataBits int
	stopBits int
	parity   string
	timeout  time.Duration
	client   modbus.Client
}

func NewModbusSensorReader(port string, baudrate, dataBits, stopBits int, parity string, timeout time.Duration) *ModbusSensorReader {
	return &ModbusSensorReader{
		port:     port,
		baudrate: baudrate,
		dataBits: dataBits,
		stopBits: stopBits,
		parity:   parity,
		timeout:  timeout,
	}
}

func (r *ModbusSensorReader) Connect() bool {
	handler := modbus.NewRTUClientHandler(r.port)
	handler.BaudRate = r.baudrate
	handler.DataBits = r.dataBits
	handler.StopBits = r.stopBits
	handler.Parity = r.parity
	handler.Timeout = r.timeout

	client := modbus.NewClient(handler)
	if err := handler.Connect(); err != nil {
		log.Printf("连接失败: %v", err)
		return false
	}

	r.client = client
	return true
}

func (r *ModbusSensorReader) ReadSensorData(slaveID, tempReg, humiReg uint16, tempScale, humiScale float64) (float64, float64, error) {
	if r.client == nil {
		return 0, 0, fmt.Errorf("客户端未连接")
	}

	tempData, err := r.client.ReadHoldingRegisters(tempReg, 1)
	if err != nil {
		return 0, 0, fmt.Errorf("读取温度寄存器失败: %v", err)
	}

	humiData, err := r.client.ReadHoldingRegisters(humiReg, 1)
	if err != nil {
		return 0, 0, fmt.Errorf("读取湿度寄存器失败: %v", err)
	}

	tempValue := float64(tempData[0]) * tempScale
	humiValue := float64(humiData[0]) * humiScale

	return tempValue, humiValue, nil
}

func (r *ModbusSensorReader) Close() {
	if r.client != nil {
		r.client = nil
	}
}

type MultiPortReader struct {
	readers     map[string]*ModbusSensorReader
	portConfigs map[string]PortConfig
}

func NewMultiPortReader(portsConfig []PortConfig) *MultiPortReader {
	readers := make(map[string]*ModbusSensorReader)
	portConfigs := make(map[string]PortConfig)

	for _, config := range portsConfig {
		reader := NewModbusSensorReader(
			config.Port,
			config.Baudrate,
			config.DataBits,
			config.StopBits,
			config.Parity,
			time.Duration(config.Timeout)*time.Second,
		)
		readers[config.Name] = reader
		portConfigs[config.Name] = config
	}

	return &MultiPortReader{
		readers:     readers,
		portConfigs: portConfigs,
	}
}

func (r *MultiPortReader) ConnectAll() bool {
	successCount := 0
	for name, reader := range r.readers {
		if reader.Connect() {
			log.Printf("已连接到串口: %s (%s)", name, reader.port)
			successCount++
		} else {
			log.Printf("连接串口失败: %s (%s)", name, reader.port)
		}
	}
	return successCount > 0
}

func (r *MultiPortReader) CloseAll() {
	for _, reader := range r.readers {
		reader.Close()
	}
	log.Println("已关闭所有串口连接")
}

func (r *MultiPortReader) GetReader(portName string) *ModbusSensorReader {
	return r.readers[portName]
}

func (r *MultiPortReader) ReadSensorData(portName string, slaveID, tempReg, humiReg uint16, tempScale, humiScale float64) (float64, float64, error) {
	reader, ok := r.readers[portName]
	if !ok {
		return 0, 0, fmt.Errorf("未找到串口: %s", portName)
	}
	return reader.ReadSensorData(slaveID, tempReg, humiReg, tempScale, humiScale)
}

func ReadAllSensors(reader *MultiPortReader, sensors []SensorConfig) []SensorData {
	results := make([]SensorData, len(sensors))

	for i, sensor := range sensors {
		temp, humi, err := reader.ReadSensorData(
			sensor.Port,
			uint16(sensor.SlaveID),
			sensor.TempReg,
			sensor.HumiReg,
			sensor.TempScale,
			sensor.HumiScale,
		)

		results[i] = SensorData{
			Name:        sensor.Name,
			Temperature: temp,
			Humidity:    humi,
			Error:       err,
		}
	}

	return results
}

func PrintSensorData(results []SensorData) {
	for _, result := range results {
		if result.Error != nil {
			fmt.Printf("  %s: 读取失败 - %v\n", result.Name, result.Error)
		} else {
			fmt.Printf("  %s: 温度=%.1f°C, 湿度=%.1f%%\n", result.Name, result.Temperature, result.Humidity)
		}
	}
}
