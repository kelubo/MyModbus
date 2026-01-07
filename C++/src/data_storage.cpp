#include "data_storage.h"
#include "config.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <ctime>
#include <iomanip>
#include <memory>

#ifdef ENABLE_INFLUXDB
    #include <curl/curl.h>
#endif

#include <sqlite3.h>

namespace {

std::string timePointToString(const std::chrono::system_clock::time_point& tp) {
    auto time = std::chrono::system_clock::to_time_t(tp);
    std::tm* tm_info = std::localtime(&time);
    std::ostringstream oss;
    oss << std::put_time(tm_info, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

class SQLiteStorage : public DataStorage {
public:
    SQLiteStorage(const std::string& dbPath) : dbPath_(dbPath), db_(nullptr) {}

    ~SQLiteStorage() override {
        close();
    }

    bool save(const SensorRecord& record) override {
        if (!db_) return false;

        std::string sql = "INSERT INTO sensor_data (sensor_name, slave_id, temperature, humidity, timestamp) "
                         "VALUES ('" + escapeString(record.sensor_name) + "', " +
                         std::to_string(record.slave_id) + ", " +
                         std::to_string(record.temperature) + ", " +
                         std::to_string(record.humidity) + ", " +
                         std::to_string(std::chrono::system_clock::to_time_t(record.timestamp)) + ")";

        char* errMsg = nullptr;
        int result = sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &errMsg);
        if (result != SQLITE_OK) {
            std::cerr << "SQLite插入失败: " << errMsg << std::endl;
            sqlite3_free(errMsg);
            return false;
        }
        return true;
    }

    bool saveBatch(const std::vector<SensorRecord>& records) override {
        if (!db_ || records.empty()) return false;

        bool success = true;
        for (const auto& record : records) {
            if (!save(record)) {
                success = false;
            }
        }
        return success;
    }

    void close() override {
        if (db_) {
            sqlite3_close(db_);
            db_ = nullptr;
        }
    }

    bool initialize() {
        int result = sqlite3_open(dbPath_.c_str(), &db_);
        if (result != SQLITE_OK) {
            std::cerr << "无法打开SQLite数据库: " << sqlite3_errmsg(db_) << std::endl;
            return false;
        }

        const char* createTableSQL =
            "CREATE TABLE IF NOT EXISTS sensor_data ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "sensor_name TEXT NOT NULL, "
            "slave_id INTEGER NOT NULL, "
            "temperature REAL NOT NULL, "
            "humidity REAL NOT NULL, "
            "timestamp INTEGER NOT NULL)";

        char* errMsg = nullptr;
        result = sqlite3_exec(db_, createTableSQL, nullptr, nullptr, &errMsg);
        if (result != SQLITE_OK) {
            std::cerr << "创建表失败: " << errMsg << std::endl;
            sqlite3_free(errMsg);
            sqlite3_close(db_);
            db_ = nullptr;
            return false;
        }

        const char* createIndexSQL = "CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_data(timestamp)";
        sqlite3_exec(db_, createIndexSQL, nullptr, nullptr, nullptr);

        return true;
    }

private:
    std::string escapeString(const std::string& str) {
        std::string result;
        for (char c : str) {
            if (c == '\'') result += "''";
            else result += c;
        }
        return result;
    }

    std::string dbPath_;
    sqlite3* db_;
};

class CSVStorage : public DataStorage {
public:
    explicit CSVStorage(const std::string& filePath) : filePath_(filePath) {
        std::ifstream test(filePath_);
        if (!test.good()) {
            std::ofstream initFile(filePath_);
            if (initFile.is_open()) {
                initFile << "sensor_name,slave_id,temperature,humidity,timestamp" << std::endl;
                initFile.close();
            }
        }
    }

    bool save(const SensorRecord& record) override {
        std::ofstream file(filePath_, std::ios::app);
        if (!file.is_open()) {
            std::cerr << "无法打开CSV文件: " << filePath_ << std::endl;
            return false;
        }

        file << record.sensor_name << ","
             << record.slave_id << ","
             << record.temperature << ","
             << record.humidity << ","
             << std::chrono::system_clock::to_time_t(record.timestamp) << std::endl;

        file.close();
        return true;
    }

    bool saveBatch(const std::vector<SensorRecord>& records) override {
        if (records.empty()) return true;

        std::ofstream file(filePath_, std::ios::app);
        if (!file.is_open()) {
            std::cerr << "无法打开CSV文件: " << filePath_ << std::endl;
            return false;
        }

        for (const auto& record : records) {
            file << record.sensor_name << ","
                 << record.slave_id << ","
                 << record.temperature << ","
                 << record.humidity << ","
                 << std::chrono::system_clock::to_time_t(record.timestamp) << std::endl;
        }

        file.close();
        return true;
    }

    void close() override {
    }

private:
    std::string filePath_;
};

#ifdef ENABLE_INFLUXDB
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

class InfluxDBStorage : public DataStorage {
public:
    InfluxDBStorage(const std::string& url, const std::string& token,
                    const std::string& org, const std::string& bucket)
        : url_(url), token_(token), org_(org), bucket_(bucket) {}

    bool save(const SensorRecord& record) override {
        return saveBatch(std::vector<SensorRecord>{record});
    }

    bool saveBatch(const std::vector<SensorRecord>& records) override {
        if (records.empty()) return true;

        std::string lineProtocol;
        for (const auto& record : records) {
            lineProtocol += "sensor_data";
            lineProtocol += ",sensor=" + escapeTagValue(record.sensor_name);
            lineProtocol += " temperature=" + std::to_string(record.temperature);
            lineProtocol += ",humidity=" + std::to_string(record.humidity);
            lineProtocol += " " + std::to_string(std::chrono::duration_cast<std::chrono::nanoseconds>(
                record.timestamp.time_since_epoch()).count()) + "\n";
        }

        CURL* curl = curl_easy_init();
        if (!curl) {
            std::cerr << "无法初始化CURL" << std::endl;
            return false;
        }

        std::string url = url_ + "/api/v2/write?org=" + org_ + "&bucket=" + bucket_;
        std::string response;

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, ("Authorization: Token " + token_).c_str());
        headers = curl_slist_append(headers, "Content-Type: text/plain");

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, lineProtocol.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, lineProtocol.length());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

        CURLcode res = curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);

        if (res != CURLE_OK) {
            std::cerr << "InfluxDB请求失败: " << curl_easy_strerror(res) << std::endl;
            return false;
        }

        long responseCode;
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode);
        if (responseCode >= 400) {
            std::cerr << "InfluxDB响应错误: " << responseCode << std::endl;
            return false;
        }

        return true;
    }

    void close() override {
    }

private:
    std::string escapeTagValue(const std::string& str) {
        std::string result;
        for (char c : str) {
            if (c == ' ' || c == ',' || c == '=') result += "\\";
            result += c;
        }
        return result;
    }

    std::string url_;
    std::string token_;
    std::string org_;
    std::string bucket_;
};
#endif

} // namespace

std::unique_ptr<DataStorage> StorageFactory::create(StorageType type, const StorageConfig& config) {
    switch (type) {
        case StorageType::SQLite: {
            auto storage = std::make_unique<SQLiteStorage>(config.sqlite_path);
            if (storage->initialize()) {
                return storage;
            }
            return nullptr;
        }
        case StorageType::CSV:
            return std::make_unique<CSVStorage>(config.csv_path);
        case StorageType::InfluxDB:
#ifdef ENABLE_INFLUXDB
            return std::make_unique<InfluxDBStorage>(
                config.influxdb_url,
                config.influxdb_token,
                config.influxdb_org,
                config.influxdb_bucket
            );
#else
            std::cerr << "InfluxDB支持未编译，请使用-DENABLE_INFLUXDB=ON" << std::endl;
            return nullptr;
#endif
        case StorageType::None:
        default:
            return nullptr;
    }
}

std::string StorageFactory::storageTypeToString(StorageType type) {
    switch (type) {
        case StorageType::SQLite: return "SQLite";
        case StorageType::InfluxDB: return "InfluxDB";
        case StorageType::CSV: return "CSV";
        case StorageType::None: return "None";
        default: return "Unknown";
    }
}
