#include "data_storage.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <fcntl.h>
#include <unistd.h>

#ifdef _WIN32
    #include <windows.h>
    #include <sqlite3.h>
    #include <process.h>
    #define THREAD_HANDLE HANDLE
    #define THREAD_CREATE(func, arg) (HANDLE)_beginthreadex(NULL, 0, (unsigned int (__stdcall*)(void*))func, arg, 0, NULL)
    #define THREAD_JOIN(handle) WaitForSingleObject(handle, INFINITE); CloseHandle(handle)
    #define SLEEP(ms) Sleep(ms)
#else
    #include <sqlite3.h>
    #include <pthread.h>
    #include <unistd.h>
    #define THREAD_HANDLE pthread_t
    #define THREAD_CREATE(func, arg) pthread_create(&func, NULL, (void* (*)(void*))func, arg)
    #define THREAD_JOIN(handle) pthread_join(handle, NULL)
    #define SLEEP(ms) usleep(ms * 1000)
#endif

// 缓存存储实现结构体
typedef struct {
    DataStorageOps ops;
    DataStorage* target_storage;
    sqlite3* cache_db;
    char cache_db_path[256];
    int flush_interval;
    int batch_size;
    bool running;
    THREAD_HANDLE flush_thread;
} CachedStorageImpl;

typedef struct {
    DataStorageOps ops;
    sqlite3* db;
    char db_path[256];
} SQLiteStorageImpl;

static bool sqlite_save(DataStorage* storage, const SensorRecord* record) {
    SQLiteStorageImpl* impl = (SQLiteStorageImpl*)storage->impl;
    char sql[512];
    snprintf(sql, sizeof(sql),
             "INSERT INTO sensor_data (sensor_name, slave_id, temperature, humidity, timestamp) VALUES ('%s', %d, %.1f, %.1f, %ld)",
             record->sensor_name, record->slave_id, record->temperature, record->humidity, (long)record->timestamp);

    char* err_msg = NULL;
    if (sqlite3_exec(impl->db, sql, NULL, NULL, &err_msg) != SQLITE_OK) {
        fprintf(stderr, "SQLite插入失败: %s\n", err_msg);
        sqlite3_free(err_msg);
        return false;
    }
    return true;
}

static bool sqlite_save_batch(DataStorage* storage, const SensorRecord* records, int count) {
    SQLiteStorageImpl* impl = (SQLiteStorageImpl*)storage->impl;
    sqlite3_exec(impl->db, "BEGIN TRANSACTION", NULL, NULL, NULL);

    for (int i = 0; i < count; i++) {
        if (!sqlite_save(storage, &records[i])) {
            sqlite3_exec(impl->db, "ROLLBACK", NULL, NULL, NULL);
            return false;
        }
    }

    sqlite3_exec(impl->db, "COMMIT", NULL, NULL, NULL);
    return true;
}

static void sqlite_close(DataStorage* storage) {
    SQLiteStorageImpl* impl = (SQLiteStorageImpl*)storage->impl;
    if (impl->db) {
        sqlite3_close(impl->db);
        impl->db = NULL;
    }
}

static DataStorageOps sqlite_ops = {
    .save = sqlite_save,
    .save_batch = sqlite_save_batch,
    .close = sqlite_close
};

static DataStorage* sqlite_storage_create(const StorageConfig* config) {
    SQLiteStorageImpl* impl = (SQLiteStorageImpl*)malloc(sizeof(SQLiteStorageImpl));
    if (!impl) return NULL;

    memset(impl, 0, sizeof(SQLiteStorageImpl));
    strncpy(impl->db_path, config->config.sqlite.db_path, sizeof(impl->db_path) - 1);

    if (sqlite3_open(impl->db_path, &impl->db) != SQLITE_OK) {
        fprintf(stderr, "无法打开SQLite数据库: %s\n", sqlite3_errmsg(impl->db));
        free(impl);
        return NULL;
    }

    char* err_msg = NULL;
    const char* create_table_sql =
        "CREATE TABLE IF NOT EXISTS sensor_data ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,"
        "sensor_name TEXT NOT NULL,"
        "slave_id INTEGER,"
        "temperature REAL,"
        "humidity REAL)";

    if (sqlite3_exec(impl->db, create_table_sql, NULL, NULL, &err_msg) != SQLITE_OK) {
        fprintf(stderr, "创建表失败: %s\n", err_msg);
        sqlite3_free(err_msg);
        sqlite3_close(impl->db);
        free(impl);
        return NULL;
    }

    sqlite3_exec(impl->db, "CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_data(timestamp)", NULL, NULL, NULL);
    sqlite3_exec(impl->db, "CREATE INDEX IF NOT EXISTS idx_sensor_name ON sensor_data(sensor_name)", NULL, NULL, NULL);

    DataStorage* storage = (DataStorage*)malloc(sizeof(DataStorage));
    if (!storage) {
        sqlite3_close(impl->db);
        free(impl);
        return NULL;
    }

    storage->ops = &sqlite_ops;
    storage->impl = impl;

    return storage;
}

typedef struct {
    DataStorageOps ops;
    FILE* file;
    char file_path[256];
} CSVStorageImpl;

static bool csv_save(DataStorage* storage, const SensorRecord* record) {
    CSVStorageImpl* impl = (CSVStorageImpl*)storage->impl;
    if (!impl->file) return false;

    char time_str[64];
    strftime(time_str, sizeof(time_str), "%Y-%m-%d %H:%M:%S", localtime(&record->timestamp));

    fprintf(impl->file, "%s,%s,%d,%.1f,%.1f\n",
            time_str, record->sensor_name, record->slave_id,
            record->temperature, record->humidity);
    fflush(impl->file);
    return true;
}

static bool csv_save_batch(DataStorage* storage, const SensorRecord* records, int count) {
    CSVStorageImpl* impl = (CSVStorageImpl*)storage->impl;
    if (!impl->file) return false;

    for (int i = 0; i < count; i++) {
        if (!csv_save(storage, &records[i])) {
            return false;
        }
    }
    return true;
}

static void csv_close(DataStorage* storage) {
    CSVStorageImpl* impl = (CSVStorageImpl*)storage->impl;
    if (impl->file) {
        fclose(impl->file);
        impl->file = NULL;
    }
}

static DataStorageOps csv_ops = {
    .save = csv_save,
    .save_batch = csv_save_batch,
    .close = csv_close
};

static DataStorage* csv_storage_create(const StorageConfig* config) {
    CSVStorageImpl* impl = (CSVStorageImpl*)malloc(sizeof(CSVStorageImpl));
    if (!impl) return NULL;

    memset(impl, 0, sizeof(CSVStorageImpl));

    if (config->config.csv.file_path[0] == '\0') {
        time_t now = time(NULL);
        strftime(impl->file_path, sizeof(impl->file_path), "sensor_data_%Y%m%d.csv", localtime(&now));
    } else {
        strncpy(impl->file_path, config->config.csv.file_path, sizeof(impl->file_path) - 1);
    }

    if (access(impl->file_path, F_OK) != 0) {
        impl->file = fopen(impl->file_path, "w");
        if (impl->file) {
            fprintf(impl->file, "timestamp,sensor_name,slave_id,temperature,humidity\n");
            fflush(impl->file);
        }
    } else {
        impl->file = fopen(impl->file_path, "a");
    }

    if (!impl->file) {
        fprintf(stderr, "无法打开CSV文件: %s\n", impl->file_path);
        free(impl);
        return NULL;
    }

    DataStorage* storage = (DataStorage*)malloc(sizeof(DataStorage));
    if (!storage) {
        fclose(impl->file);
        free(impl);
        return NULL;
    }

    storage->ops = &csv_ops;
    storage->impl = impl;

    return storage;
}

typedef struct {
    DataStorageOps ops;
    void* client;
    void* write_api;
    char bucket[256];
    char org[256];
} InfluxDBStorageImpl;

static bool influxdb_save(DataStorage* storage, const SensorRecord* record) {
    (void)storage;
    (void)record;
    return true;
}

static bool influxdb_save_batch(DataStorage* storage, const SensorRecord* records, int count) {
    (void)storage;
    (void)records;
    (void)count;
    return true;
}

static void influxdb_close(DataStorage* storage) {
    InfluxDBStorageImpl* impl = (InfluxDBStorageImpl*)storage->impl;
    if (impl) {
        free(impl);
        storage->impl = NULL;
    }
}

static DataStorageOps influxdb_ops = {
    .save = influxdb_save,
    .save_batch = influxdb_save_batch,
    .close = influxdb_close
};

static DataStorage* influxdb_storage_create(const StorageConfig* config) {
    InfluxDBStorageImpl* impl = (InfluxDBStorageImpl*)malloc(sizeof(InfluxDBStorageImpl));
    if (!impl) return NULL;

    memset(impl, 0, sizeof(InfluxDBStorageImpl));
    strncpy(impl->bucket, config->config.influxdb.bucket, sizeof(impl->bucket) - 1);
    strncpy(impl->org, config->config.influxdb.org, sizeof(impl->org) - 1);

    DataStorage* storage = (DataStorage*)malloc(sizeof(DataStorage));
    if (!storage) {
        free(impl);
        return NULL;
    }

    storage->ops = &influxdb_ops;
    storage->impl = impl;

    printf("提示: InfluxDB存储需要libinfluxdb库支持，目前仅占位实现\n");

    return storage;
}

DataStorage* storage_create(const StorageConfig* config) {
    DataStorage* target_storage = NULL;
    
    switch (config->type) {
        case STORAGE_TYPE_SQLITE:
            target_storage = sqlite_storage_create(config);
            break;
        case STORAGE_TYPE_CSV:
            target_storage = csv_storage_create(config);
            break;
        case STORAGE_TYPE_INFLUXDB:
            target_storage = influxdb_storage_create(config);
            break;
        case STORAGE_TYPE_NONE:
        default:
            return NULL;
    }
    
    // 如果启用了缓存，包装目标存储
    if (config->enable_cache && target_storage) {
        return cached_storage_create(config, target_storage);
    }
    
    return target_storage;
}

// 缓存数据库初始化
static bool cached_storage_init_db(CachedStorageImpl* impl) {
    if (sqlite3_open(impl->cache_db_path, &impl->cache_db) != SQLITE_OK) {
        fprintf(stderr, "无法打开缓存数据库: %s\n", sqlite3_errmsg(impl->cache_db));
        return false;
    }

    const char* create_table_sql = 
        "CREATE TABLE IF NOT EXISTS data_cache ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "sensor_name TEXT NOT NULL,"
        "slave_id INTEGER,"
        "temperature REAL,"
        "humidity REAL,"
        "timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,"
        "retry_count INTEGER DEFAULT 0"
        ")";

    char* err_msg = NULL;
    if (sqlite3_exec(impl->cache_db, create_table_sql, NULL, NULL, &err_msg) != SQLITE_OK) {
        fprintf(stderr, "创建缓存表失败: %s\n", err_msg);
        sqlite3_free(err_msg);
        sqlite3_close(impl->cache_db);
        impl->cache_db = NULL;
        return false;
    }

    sqlite3_exec(impl->cache_db, "CREATE INDEX IF NOT EXISTS idx_processed ON data_cache(retry_count)", NULL, NULL, NULL);
    return true;
}

// 刷新缓存工作线程
static void* cached_storage_flush_worker(void* arg) {
    CachedStorageImpl* impl = (CachedStorageImpl*)arg;
    
    while (impl->running) {
        SLEEP(impl->flush_interval * 1000);
        
        // 从缓存中获取待同步的数据
        sqlite3_stmt* stmt;
        const char* query = "SELECT id, sensor_name, slave_id, temperature, humidity FROM data_cache WHERE retry_count < 10 ORDER BY id LIMIT ?";
        
        if (sqlite3_prepare_v2(impl->cache_db, query, -1, &stmt, NULL) != SQLITE_OK) {
            fprintf(stderr, "准备缓存查询失败: %s\n", sqlite3_errmsg(impl->cache_db));
            continue;
        }

        sqlite3_bind_int(stmt, 1, impl->batch_size);
        
        bool has_records = false;
        sqlite3_exec(impl->cache_db, "BEGIN TRANSACTION", NULL, NULL, NULL);
        
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            has_records = true;
            
            int id = sqlite3_column_int(stmt, 0);
            const unsigned char* sensor_name = sqlite3_column_text(stmt, 1);
            int slave_id = sqlite3_column_int(stmt, 2);
            double temperature = sqlite3_column_double(stmt, 3);
            double humidity = sqlite3_column_double(stmt, 4);
            
            SensorRecord record;
            strncpy(record.sensor_name, (const char*)sensor_name, sizeof(record.sensor_name) - 1);
            record.slave_id = slave_id;
            record.temperature = (float)temperature;
            record.humidity = (float)humidity;
            record.timestamp = time(NULL);
            
            // 尝试同步到目标存储
            if (impl->target_storage->ops->save(impl->target_storage, &record)) {
                // 同步成功，删除缓存记录
                char delete_sql[256];
                snprintf(delete_sql, sizeof(delete_sql), "DELETE FROM data_cache WHERE id = %d", id);
                sqlite3_exec(impl->cache_db, delete_sql, NULL, NULL, NULL);
                printf("[缓存] 同步成功: %s\n", record.sensor_name);
            } else {
                // 同步失败，增加重试计数
                char update_sql[256];
                snprintf(update_sql, sizeof(update_sql), "UPDATE data_cache SET retry_count = retry_count + 1 WHERE id = %d", id);
                sqlite3_exec(impl->cache_db, update_sql, NULL, NULL, NULL);
                printf("[缓存] 同步失败，将稍后重试\n");
            }
        }
        
        sqlite3_exec(impl->cache_db, "COMMIT", NULL, NULL, NULL);
        sqlite3_finalize(stmt);
        
        if (has_records) {
            printf("[缓存] 刷新完成\n");
        }
    }
    
    return NULL;
}

// 缓存存储保存函数
static bool cached_storage_save(DataStorage* storage, const SensorRecord* record) {
    CachedStorageImpl* impl = (CachedStorageImpl*)storage->impl;
    
    // 保存到缓存
    char insert_sql[512];
    snprintf(insert_sql, sizeof(insert_sql), 
             "INSERT INTO data_cache (sensor_name, slave_id, temperature, humidity) VALUES ('%s', %d, %.1f, %.1f)",
             record->sensor_name, record->slave_id, record->temperature, record->humidity);
    
    char* err_msg = NULL;
    if (sqlite3_exec(impl->cache_db, insert_sql, NULL, NULL, &err_msg) != SQLITE_OK) {
        fprintf(stderr, "[缓存] 保存到缓存失败: %s\n", err_msg);
        sqlite3_free(err_msg);
        return false;
    }
    
    printf("[缓存] 数据已保存到本地缓存: %s - 温度%.1f, 湿度%.1f\n", 
           record->sensor_name, record->temperature, record->humidity);
    
    // 尝试实时同步到目标存储
    if (impl->target_storage->ops->save(impl->target_storage, record)) {
        // 同步成功，删除缓存中的记录
        char delete_sql[512];
        snprintf(delete_sql, sizeof(delete_sql), 
                 "DELETE FROM data_cache WHERE sensor_name = '%s' AND slave_id = %d AND temperature = %.1f AND humidity = %.1f AND retry_count = 0",
                 record->sensor_name, record->slave_id, record->temperature, record->humidity);
        sqlite3_exec(impl->cache_db, delete_sql, NULL, NULL, NULL);
        printf("[缓存] 实时同步成功: %s\n", record->sensor_name);
        return true;
    } else {
        printf("[缓存] 实时同步失败，将稍后重试\n");
        return true; // 只要保存到缓存就返回成功
    }
}

// 缓存存储批量保存函数
static bool cached_storage_save_batch(DataStorage* storage, const SensorRecord* records, int count) {
    CachedStorageImpl* impl = (CachedStorageImpl*)storage->impl;
    
    sqlite3_exec(impl->cache_db, "BEGIN TRANSACTION", NULL, NULL, NULL);
    
    for (int i = 0; i < count; i++) {
        char insert_sql[512];
        snprintf(insert_sql, sizeof(insert_sql), 
                 "INSERT INTO data_cache (sensor_name, slave_id, temperature, humidity) VALUES ('%s', %d, %.1f, %.1f)",
                 records[i].sensor_name, records[i].slave_id, records[i].temperature, records[i].humidity);
        
        char* err_msg = NULL;
        if (sqlite3_exec(impl->cache_db, insert_sql, NULL, NULL, &err_msg) != SQLITE_OK) {
            fprintf(stderr, "[缓存] 批量保存到缓存失败: %s\n", err_msg);
            sqlite3_free(err_msg);
            sqlite3_exec(impl->cache_db, "ROLLBACK", NULL, NULL, NULL);
            return false;
        }
    }
    
    sqlite3_exec(impl->cache_db, "COMMIT", NULL, NULL, NULL);
    printf("[缓存] 批量数据已保存到本地缓存: %d 条\n", count);
    
    return true;
}

// 缓存存储关闭函数
static void cached_storage_close(DataStorage* storage) {
    CachedStorageImpl* impl = (CachedStorageImpl*)storage->impl;
    
    if (!impl) return;
    
    // 停止工作线程
    impl->running = false;
    if (impl->flush_thread) {
        THREAD_JOIN(impl->flush_thread);
    }
    
    // 关闭缓存数据库
    if (impl->cache_db) {
        sqlite3_close(impl->cache_db);
        impl->cache_db = NULL;
    }
    
    // 关闭目标存储
    if (impl->target_storage) {
        storage_free(impl->target_storage);
        impl->target_storage = NULL;
    }
    
    free(impl);
    storage->impl = NULL;
}

static DataStorageOps cached_ops = {
    .save = cached_storage_save,
    .save_batch = cached_storage_save_batch,
    .close = cached_storage_close
};

// 创建带缓存的存储
static DataStorage* cached_storage_create(const StorageConfig* config, DataStorage* target_storage) {
    CachedStorageImpl* impl = (CachedStorageImpl*)malloc(sizeof(CachedStorageImpl));
    if (!impl) return NULL;
    
    memset(impl, 0, sizeof(CachedStorageImpl));
    impl->target_storage = target_storage;
    
    if (config->cache.cache_db_path[0] == '\0') {
        snprintf(impl->cache_db_path, sizeof(impl->cache_db_path), "sensor_cache.db");
    } else {
        strncpy(impl->cache_db_path, config->cache.cache_db_path, sizeof(impl->cache_db_path) - 1);
    }
    
    impl->flush_interval = config->cache.flush_interval > 0 ? config->cache.flush_interval : 10;
    impl->batch_size = config->cache.batch_size > 0 ? config->cache.batch_size : 100;
    impl->running = true;
    
    // 初始化缓存数据库
    if (!cached_storage_init_db(impl)) {
        fprintf(stderr, "初始化缓存数据库失败\n");
        free(impl);
        return NULL;
    }
    
    // 启动刷新线程
    THREAD_CREATE(impl->flush_thread, impl);
    
    DataStorage* storage = (DataStorage*)malloc(sizeof(DataStorage));
    if (!storage) {
        cached_storage_close((DataStorage*){&cached_ops, impl});
        return NULL;
    }
    
    storage->ops = &cached_ops;
    storage->impl = impl;
    
    printf("[缓存] 本地缓存功能已启用\n");
    return storage;
}

void storage_free(DataStorage* storage) {
    if (storage) {
        if (storage->ops && storage->ops->close) {
            storage->ops->close(storage);
        }
        free(storage);
    }
}

StorageConfig get_default_storage_config(void) {
    StorageConfig config;
    config.type = STORAGE_TYPE_SQLITE;
    snprintf(config.config.sqlite.db_path, sizeof(config.config.sqlite.db_path), "sensor_data.db");
    snprintf(config.config.influxdb.url, sizeof(config.config.influxdb.url), "http://localhost:8086");
    snprintf(config.config.influxdb.token, sizeof(config.config.influxdb.token), "my-token");
    snprintf(config.config.influxdb.org, sizeof(config.config.influxdb.org), "my-org");
    snprintf(config.config.influxdb.bucket, sizeof(config.config.influxdb.bucket), "sensor-data");
    config.config.csv.file_path[0] = '\0';
    
    // 默认缓存配置
    config.enable_cache = true;
    snprintf(config.cache.cache_db_path, sizeof(config.cache.cache_db_path), "sensor_cache.db");
    config.cache.flush_interval = 10;
    config.cache.batch_size = 100;
    
    return config;
}
