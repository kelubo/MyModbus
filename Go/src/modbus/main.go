package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func saveSensorData(storage DataStorage, results []SensorData, sensors []SensorConfig) {
	if storage == nil {
		return
	}

	sensorMap := make(map[string]SensorConfig)
	for _, s := range sensors {
		sensorMap[s.Name] = s
	}

	records := make([]*SensorRecord, 0)
	for _, result := range results {
		if result.Error == nil && result.Name != "" {
			if sensor, ok := sensorMap[result.Name]; ok {
				records = append(records, &SensorRecord{
					SensorName:  result.Name,
					SlaveID:     int(sensor.SlaveID),
					Temperature: result.Temperature,
					Humidity:    result.Humidity,
					Timestamp:   time.Now(),
				})
			}
		}
	}

	if len(records) > 0 {
		storage.SaveBatch(records)
	}
}

func main() {
	config, err := LoadConfig("config.yaml")
	if err != nil {
		fmt.Printf("警告: 无法加载配置文件: %v，使用默认配置\n", err)
		config = &Config{
			Modbus: ModbusConfig{
				Ports: []PortConfig{
					{Name: "串口1", Port: getDefaultPort(), Baudrate: 9600, DataBits: 8, StopBits: 1, Parity: "N", Timeout: 1.0},
				},
				ReadInterval: 2,
				Sensors: []SensorConfig{
					{Name: "传感器1", Port: "串口1", SlaveID: 1, TempReg: 0, HumiReg: 1, TempScale: 0.1, HumiScale: 0.1},
				},
			},
			Storage: *GetDefaultStorageConfig(),
		}
	}

	config.Print()

	factory := &StorageFactory{}
	storage, err := factory.CreateStorage(&config.Storage)
	if err != nil {
		fmt.Printf("警告: 无法创建存储: %v\n", err)
	} else if storage != nil {
		fmt.Printf("数据存储已启用: %s\n", config.Storage.Type)
	} else {
		fmt.Println("数据存储已禁用")
	}

	fmt.Println("正在初始化Modbus连接...")

	multiReader := NewMultiPortReader(config.Modbus.Ports)

	if !multiReader.ConnectAll() {
		fmt.Println("错误：无法连接到任何串口")
		os.Exit(1)
	}

	sensors := make([]SensorConfig, len(config.Modbus.Sensors))
	for i, s := range config.Modbus.Sensors {
		sensors[i] = SensorConfig{
			Name:      s.Name,
			Port:      s.Port,
			SlaveID:   s.SlaveID,
			TempReg:   s.TempReg,
			HumiReg:   s.HumiReg,
			TempScale: s.TempScale,
			HumiScale: s.HumiScale,
		}
	}

	fmt.Printf("已配置 %d 个传感器\n", len(sensors))
	fmt.Println("开始读取温湿度数据...")
	fmt.Println("按 Ctrl+C 退出程序")
	fmt.Println()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGINT)
	go func() {
		<-c
		fmt.Println("\n正在关闭连接...")
		if storage != nil {
			storage.Close()
		}
		multiReader.CloseAll()
		os.Exit(0)
	}()

	for {
		currentTime := time.Now().Format("2006-01-02 15:04:05")
		fmt.Printf("[%s]\n", currentTime)

		results := ReadAllSensors(multiReader, sensors)
		PrintSensorData(results)
		saveSensorData(storage, results, sensors)

		time.Sleep(time.Duration(config.Modbus.ReadInterval) * time.Second)
	}
}
