package main

import (
	"fmt"
	"os"
	"runtime"

	"gopkg.in/yaml.v3"
)

type PortConfig struct {
	Name     string  `yaml:"name"`
	Port     string  `yaml:"port"`
	Baudrate int     `yaml:"baudrate"`
	DataBits int     `yaml:"data_bits"`
	StopBits int     `yaml:"stop_bits"`
	Parity   string  `yaml:"parity"`
	Timeout  float64 `yaml:"timeout"`
}

type SensorConfig struct {
	Name      string  `yaml:"name"`
	Port      string  `yaml:"port"`
	SlaveID   uint8   `yaml:"slave_id"`
	TempReg   uint16  `yaml:"temp_reg"`
	HumiReg   uint16  `yaml:"humi_reg"`
	TempScale float64 `yaml:"temp_scale"`
	HumiScale float64 `yaml:"humi_scale"`
}

type StorageConfig struct {
	Type           string         `yaml:"storage_type"`
	SQLiteConfig   SQLiteConfig   `yaml:"sqlite_config"`
	InfluxDBConfig InfluxDBConfig `yaml:"influxdb_config"`
	CSVConfig      CSVConfig      `yaml:"csv_config"`
	CacheConfig    CacheConfig    `yaml:"cache_config"`
}

type SQLiteConfig struct {
	DBPath string `yaml:"db_path"`
}

type InfluxDBConfig struct {
	URL    string `yaml:"url"`
	Token  string `yaml:"token"`
	Org    string `yaml:"org"`
	Bucket string `yaml:"bucket"`
}

type CSVConfig struct {
	FilePath string `yaml:"file_path"`
}

type CacheConfig struct {
	Enabled       bool   `yaml:"enabled"`
	DBPath        string `yaml:"db_path"`
	FlushInterval int    `yaml:"flush_interval"`
	BatchSize     int    `yaml:"batch_size"`
}

type ModbusConfig struct {
	Ports        []PortConfig   `yaml:"ports"`
	ReadInterval int            `yaml:"read_interval"`
	Sensors      []SensorConfig `yaml:"sensors"`
}

type Config struct {
	Modbus  ModbusConfig  `yaml:"modbus"`
	Storage StorageConfig `yaml:"storage"`
}

func LoadConfig(filename string) (*Config, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("无法读取配置文件: %w", err)
	}

	var config Config
	err = yaml.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("解析配置文件失败: %w", err)
	}

	if len(config.Modbus.Ports) == 0 {
		port := getDefaultPort()
		config.Modbus.Ports = []PortConfig{
			{Name: "串口1", Port: port, Baudrate: 9600, DataBits: 8, StopBits: 1, Parity: "N", Timeout: 1.0},
		}
	}

	for i := range config.Modbus.Ports {
		port := &config.Modbus.Ports[i]
		if port.Baudrate == 0 {
			port.Baudrate = 9600
		}
		if port.DataBits == 0 {
			port.DataBits = 8
		}
		if port.StopBits == 0 {
			port.StopBits = 1
		}
		if port.Parity == "" {
			port.Parity = "N"
		}
		if port.Timeout == 0 {
			port.Timeout = 1.0
		}
	}

	if config.Modbus.ReadInterval == 0 {
		config.Modbus.ReadInterval = 2
	}

	for i := range config.Modbus.Sensors {
		sensor := &config.Modbus.Sensors[i]
		if sensor.TempScale == 0 {
			sensor.TempScale = 0.1
		}
		if sensor.HumiScale == 0 {
			sensor.HumiScale = 0.1
		}
	}

	if config.Storage.Type == "" {
		config.Storage.Type = StorageTypeSQLite
	}
	if config.Storage.SQLiteConfig.DBPath == "" {
		config.Storage.SQLiteConfig.DBPath = "sensor_data.db"
	}
	if config.Storage.InfluxDBConfig.URL == "" {
		config.Storage.InfluxDBConfig.URL = "http://localhost:8086"
	}
	if config.Storage.CSVConfig.FilePath == "" {
		config.Storage.CSVConfig.FilePath = "sensor_data.csv"
	}
	if config.Storage.CacheConfig.DBPath == "" {
		config.Storage.CacheConfig.DBPath = "sensor_cache.db"
	}
	if config.Storage.CacheConfig.FlushInterval <= 0 {
		config.Storage.CacheConfig.FlushInterval = 10
	}
	if config.Storage.CacheConfig.BatchSize <= 0 {
		config.Storage.CacheConfig.BatchSize = 100
	}

	return &config, nil
}

func (c *Config) Print() {
	fmt.Println("配置信息:")
	fmt.Printf("  串口数量: %d\n", len(c.Modbus.Ports))
	for _, port := range c.Modbus.Ports {
		fmt.Printf("    - %s: %s (波特率: %d, 数据位: %d, 停止位: %d, 校验: %s)\n",
			port.Name, port.Port, port.Baudrate, port.DataBits, port.StopBits, port.Parity)
	}
	fmt.Printf("  读取间隔: %d秒\n", c.Modbus.ReadInterval)
	fmt.Printf("  存储类型: %s\n", c.Storage.Type)
	fmt.Printf("  传感器数量: %d\n", len(c.Modbus.Sensors))

	for i, sensor := range c.Modbus.Sensors {
		fmt.Printf("  传感器%d: %s (串口: %s, 从站地址: %d)\n",
			i+1, sensor.Name, sensor.Port, sensor.SlaveID)
	}
}

func getDefaultPort() string {
	if runtime.GOOS == "windows" {
		return "COM3"
	}
	return "/dev/ttyUSB0"
}
