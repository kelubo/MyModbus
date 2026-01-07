package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"os"
	"sync"
	"time"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api"
	_ "github.com/mattn/go-sqlite3"
)

const (
	StorageTypeSQLite   = "sqlite"
	StorageTypeInfluxDB = "influxdb"
	StorageTypeCSV      = "csv"
	StorageTypeNone     = "none"
)

type SensorRecord struct {
	SensorName  string
	SlaveID     int
	Temperature float64
	Humidity    float64
	Timestamp   time.Time
}

type DataStorage interface {
	Save(record *SensorRecord) error
	SaveBatch(records []*SensorRecord) error
	Close() error
}

type SQLiteStorage struct {
	dbPath string
	db     *sql.DB
}

func NewSQLiteStorage(dbPath string) (*SQLiteStorage, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("打开数据库失败: %v", err)
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS sensor_data (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			sensor_name TEXT NOT NULL,
			slave_id INTEGER,
			temperature REAL,
			humidity REAL
		)
	`)
	if err != nil {
		return nil, fmt.Errorf("创建表失败: %v", err)
	}

	_, err = db.Exec("CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_data(timestamp)")
	if err != nil {
		return nil, fmt.Errorf("创建索引失败: %v", err)
	}

	_, err = db.Exec("CREATE INDEX IF NOT EXISTS idx_sensor_name ON sensor_data(sensor_name)")
	if err != nil {
		return nil, fmt.Errorf("创建索引失败: %v", err)
	}

	return &SQLiteStorage{dbPath: dbPath, db: db}, nil
}

func (s *SQLiteStorage) Save(record *SensorRecord) error {
	_, err := s.db.Exec(
		"INSERT INTO sensor_data (sensor_name, slave_id, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)",
		record.SensorName, record.SlaveID, record.Temperature, record.Humidity, record.Timestamp,
	)
	return err
}

func (s *SQLiteStorage) SaveBatch(records []*SensorRecord) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(
		"INSERT INTO sensor_data (sensor_name, slave_id, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)",
	)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, record := range records {
		_, err := stmt.Exec(
			record.SensorName, record.SlaveID, record.Temperature, record.Humidity, record.Timestamp,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *SQLiteStorage) Query(limit, offset int) ([]map[string]interface{}, error) {
	rows, err := s.db.Query(
		"SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT ? OFFSET ?",
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		err := rows.Scan(valuePtrs...)
		if err != nil {
			return nil, err
		}

		for i, col := range columns {
			row[col] = values[i]
		}
		results = append(results, row)
	}

	return results, nil
}

func (s *SQLiteStorage) GetStats() (map[string]interface{}, error) {
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM sensor_data").Scan(&count)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"total_records": count}, nil
}

func (s *SQLiteStorage) Close() error {
	return s.db.Close()
}

type InfluxDBStorage struct {
	url      string
	token    string
	org      string
	bucket   string
	client   influxdb2.Client
	writeAPI api.WriteAPI
}

func (s *InfluxDBStorage) Save(record *SensorRecord) error {
	point := influxdb2.NewPoint("sensor_data",
		map[string]string{
			"sensor":   record.SensorName,
			"slave_id": fmt.Sprintf("%d", record.SlaveID),
		},
		map[string]interface{}{
			"temperature": record.Temperature,
			"humidity":    record.Humidity,
		},
		record.Timestamp,
	)
	s.writeAPI.WritePoint(point)
	return nil
}

func (s *InfluxDBStorage) SaveBatch(records []*SensorRecord) error {
	for _, record := range records {
		point := influxdb2.NewPoint("sensor_data",
			map[string]string{
				"sensor":   record.SensorName,
				"slave_id": fmt.Sprintf("%d", record.SlaveID),
			},
			map[string]interface{}{
				"temperature": record.Temperature,
				"humidity":    record.Humidity,
			},
			record.Timestamp,
		)
		s.writeAPI.WritePoint(point)
	}
	return nil
}

func (s *InfluxDBStorage) Close() error {
	s.writeAPI.Flush()
	s.client.Close() // Close doesn't return a value
	return nil
}

type CSVStorage struct {
	filePath string
	file     *os.File
}

func NewCSVStorage(filePath string) (*CSVStorage, error) {
	var file *os.File
	var err error

	if _, err = os.Stat(filePath); os.IsNotExist(err) {
		file, err = os.Create(filePath)
		if err != nil {
			return nil, err
		}
		writer := csv.NewWriter(file)
		writer.Write([]string{"timestamp", "sensor_name", "slave_id", "temperature", "humidity"})
		writer.Flush()
	} else {
		file, err = os.OpenFile(filePath, os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			return nil, err
		}
	}

	return &CSVStorage{filePath: filePath, file: file}, nil
}

func (s *CSVStorage) Save(record *SensorRecord) error {
	writer := csv.NewWriter(s.file)
	defer writer.Flush()

	return writer.Write([]string{
		record.Timestamp.Format("2006-01-02 15:04:05"),
		record.SensorName,
		fmt.Sprintf("%d", record.SlaveID),
		fmt.Sprintf("%.1f", record.Temperature),
		fmt.Sprintf("%.1f", record.Humidity),
	})
}

func (s *CSVStorage) SaveBatch(records []*SensorRecord) error {
	writer := csv.NewWriter(s.file)
	defer writer.Flush()

	for _, record := range records {
		err := writer.Write([]string{
			record.Timestamp.Format("2006-01-02 15:04:05"),
			record.SensorName,
			fmt.Sprintf("%d", record.SlaveID),
			fmt.Sprintf("%.1f", record.Temperature),
			fmt.Sprintf("%.1f", record.Humidity),
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *CSVStorage) Close() error {
	return s.file.Close()
}

type StorageFactory struct{}

func (f *StorageFactory) CreateStorage(config *StorageConfig) (DataStorage, error) {
	var storage DataStorage
	var err error

	switch config.Type {
	case StorageTypeSQLite:
		storage, err = NewSQLiteStorage(config.SQLiteConfig.DBPath)
	case StorageTypeInfluxDB:
		options := influxdb2.DefaultOptions()
		client := influxdb2.NewClientWithOptions(
			config.InfluxDBConfig.URL,
			config.InfluxDBConfig.Token,
			options,
		)
		storage = &InfluxDBStorage{
			url:      config.InfluxDBConfig.URL,
			token:    config.InfluxDBConfig.Token,
			org:      config.InfluxDBConfig.Org,
			bucket:   config.InfluxDBConfig.Bucket,
			client:   client,
			writeAPI: client.WriteAPI(config.InfluxDBConfig.Org, config.InfluxDBConfig.Bucket),
		}
	case StorageTypeCSV:
		storage, err = NewCSVStorage(config.CSVConfig.FilePath)
	case StorageTypeNone:
		return nil, nil
	default:
		storage, err = NewSQLiteStorage(config.SQLiteConfig.DBPath)
	}

	if err != nil {
		return nil, err
	}

	if storage == nil {
		return nil, nil
	}

	if config.CacheConfig.Enabled {
		cacheDBPath := config.CacheConfig.DBPath
		if cacheDBPath == "" {
			cacheDBPath = "sensor_cache.db"
		}
		flushInterval := config.CacheConfig.FlushInterval
		if flushInterval <= 0 {
			flushInterval = 10
		}
		batchSize := config.CacheConfig.BatchSize
		if batchSize <= 0 {
			batchSize = 100
		}

		return NewCachedStorage(storage, cacheDBPath, flushInterval, batchSize)
	}

	return storage, nil
}

func GetDefaultStorageConfig() *StorageConfig {
	return &StorageConfig{
		Type:           StorageTypeSQLite,
		SQLiteConfig:   SQLiteConfig{DBPath: "sensor_data.db"},
		InfluxDBConfig: InfluxDBConfig{URL: "http://localhost:8086", Token: "my-token", Org: "my-org", Bucket: "sensor-data"},
		CSVConfig:      CSVConfig{FilePath: "sensor_data.csv"},
		CacheConfig:    CacheConfig{Enabled: false, DBPath: "sensor_cache.db", FlushInterval: 10, BatchSize: 100},
	}
}

type CacheRecord struct {
	ID          int64
	SensorName  string
	SlaveID     int
	Temperature float64
	Humidity    float64
	Timestamp   time.Time
	RetryCount  int
}

type CachedStorage struct {
	targetStorage DataStorage
	cacheDBPath   string
	cacheDB       *sql.DB
	flushInterval int
	batchSize     int
	running       bool
	mu            sync.Mutex
}

func NewCachedStorage(targetStorage DataStorage, cacheDBPath string, flushInterval, batchSize int) (*CachedStorage, error) {
	cacheDB, err := sql.Open("sqlite3", cacheDBPath)
	if err != nil {
		return nil, fmt.Errorf("打开缓存数据库失败: %v", err)
	}

	_, err = cacheDB.Exec(`
		CREATE TABLE IF NOT EXISTS data_cache (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sensor_name TEXT NOT NULL,
			slave_id INTEGER,
			temperature REAL,
			humidity REAL,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			retry_count INTEGER DEFAULT 0
		)
	`)
	if err != nil {
		return nil, fmt.Errorf("创建缓存表失败: %v", err)
	}

	_, err = cacheDB.Exec("CREATE INDEX IF NOT EXISTS idx_cache_retry ON data_cache(retry_count)")
	if err != nil {
		return nil, fmt.Errorf("创建缓存索引失败: %v", err)
	}

	cached := &CachedStorage{
		targetStorage: targetStorage,
		cacheDBPath:   cacheDBPath,
		cacheDB:       cacheDB,
		flushInterval: flushInterval,
		batchSize:     batchSize,
		running:       true,
	}

	go cached.flushWorker()

	return cached, nil
}

func (c *CachedStorage) flushWorker() {
	ticker := time.NewTicker(time.Duration(c.flushInterval) * time.Second)
	defer ticker.Stop()

	for c.running {
		<-ticker.C
		c.flushCache()
	}
}

func (c *CachedStorage) flushCache() {
	c.mu.Lock()
	defer c.mu.Unlock()

	rows, err := c.cacheDB.Query(
		"SELECT * FROM data_cache WHERE retry_count < 10 ORDER BY id LIMIT ?",
		c.batchSize,
	)
	if err != nil {
		fmt.Printf("[缓存] 查询缓存失败: %v\n", err)
		return
	}
	defer rows.Close()

	var records []CacheRecord
	for rows.Next() {
		var record CacheRecord
		var timestamp sql.NullTime
		err := rows.Scan(
			&record.ID, &record.SensorName, &record.SlaveID,
			&record.Temperature, &record.Humidity, &timestamp, &record.RetryCount,
		)
		if err != nil {
			fmt.Printf("[缓存] 扫描记录失败: %v\n", err)
			continue
		}
		if timestamp.Valid {
			record.Timestamp = timestamp.Time
		}
		records = append(records, record)
	}

	if len(records) == 0 {
		return
	}

	fmt.Printf("[缓存] 发现 %d 条待同步数据\n", len(records))

	for _, record := range records {
		sensorRecord := &SensorRecord{
			SensorName:  record.SensorName,
			SlaveID:     record.SlaveID,
			Temperature: record.Temperature,
			Humidity:    record.Humidity,
			Timestamp:   time.Now(),
		}

		err := c.targetStorage.Save(sensorRecord)
		if err != nil {
			_, updateErr := c.cacheDB.Exec(
				"UPDATE data_cache SET retry_count = retry_count + 1 WHERE id = ?",
				record.ID,
			)
			if updateErr != nil {
				fmt.Printf("[缓存] 更新重试次数失败: %v\n", updateErr)
			}
			fmt.Printf("[缓存] 同步失败: %v\n", err)
		} else {
			_, deleteErr := c.cacheDB.Exec("DELETE FROM data_cache WHERE id = ?", record.ID)
			if deleteErr != nil {
				fmt.Printf("[缓存] 删除已同步记录失败: %v\n", deleteErr)
			}
			fmt.Printf("[缓存] 同步成功: %s\n", record.SensorName)
		}
	}
}

func (c *CachedStorage) Save(record *SensorRecord) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	_, err := c.cacheDB.Exec(
		"INSERT INTO data_cache (sensor_name, slave_id, temperature, humidity) VALUES (?, ?, ?, ?)",
		record.SensorName, record.SlaveID, record.Temperature, record.Humidity,
	)
	if err != nil {
		return fmt.Errorf("保存到缓存失败: %v", err)
	}

	fmt.Printf("[缓存] 数据已保存到本地缓存: %s - 温度%.1f, 湿度%.1f\n",
		record.SensorName, record.Temperature, record.Humidity)

	err = c.targetStorage.Save(record)
	if err != nil {
		fmt.Printf("[缓存] 实时同步失败，将稍后重试: %v\n", err)
		return nil
	}

	_, err = c.cacheDB.Exec(
		"DELETE FROM data_cache WHERE sensor_name = ? AND slave_id = ? AND temperature = ? AND humidity = ? AND retry_count = 0",
		record.SensorName, record.SlaveID, record.Temperature, record.Humidity,
	)
	if err != nil {
		fmt.Printf("[缓存] 删除实时同步记录失败: %v\n", err)
	}

	fmt.Printf("[缓存] 实时同步成功: %s\n", record.SensorName)
	return nil
}

func (c *CachedStorage) SaveBatch(records []*SensorRecord) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, record := range records {
		_, err := c.cacheDB.Exec(
			"INSERT INTO data_cache (sensor_name, slave_id, temperature, humidity) VALUES (?, ?, ?, ?)",
			record.SensorName, record.SlaveID, record.Temperature, record.Humidity,
		)
		if err != nil {
			return fmt.Errorf("批量保存到缓存失败: %v", err)
		}
	}

	fmt.Printf("[缓存] 批量数据已保存到本地缓存，共 %d 条\n", len(records))

	for _, record := range records {
		err := c.targetStorage.Save(record)
		if err != nil {
			fmt.Printf("[缓存] 批量实时同步失败: %v\n", err)
		} else {
			_, execErr := c.cacheDB.Exec(
				"DELETE FROM data_cache WHERE sensor_name = ? AND slave_id = ? AND temperature = ? AND humidity = ? AND retry_count = 0",
				record.SensorName, record.SlaveID, record.Temperature, record.Humidity,
			)
			if execErr != nil {
				fmt.Printf("[缓存] 删除批量实时同步记录失败: %v\n", execErr)
			}
		}
	}

	return nil
}

func (c *CachedStorage) Close() error {
	c.running = false

	c.mu.Lock()
	defer c.mu.Unlock()

	c.flushCache()

	if c.cacheDB != nil {
		return c.cacheDB.Close()
	}
	return nil
}

func (c *CachedStorage) GetCacheStats() (map[string]interface{}, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var totalCount, pendingCount int
	err := c.cacheDB.QueryRow("SELECT COUNT(*) FROM data_cache").Scan(&totalCount)
	if err != nil {
		return nil, err
	}

	err = c.cacheDB.QueryRow("SELECT COUNT(*) FROM data_cache WHERE retry_count < 10").Scan(&pendingCount)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_records": totalCount,
		"pending_count": pendingCount,
		"cache_db_path": c.cacheDBPath,
	}, nil
}
