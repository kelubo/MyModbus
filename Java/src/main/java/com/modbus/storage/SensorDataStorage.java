package com.modbus.storage;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class SensorDataStorage implements com.modbus.data.DataStorage {
    private String type;
    private String connectionString;
    private String csvPath;
    private Connection connection;
    private FileWriter csvWriter;
    private boolean isInfluxdbConfigured;
    private String influxdbUrl;
    private String influxdbToken;
    private String influxdbOrg;
    private String influxdbBucket;

    public SensorDataStorage(String type, String sqlitePath, String csvPath,
                             String influxdbUrl, String influxdbToken, 
                             String influxdbOrg, String influxdbBucket) {
        this.type = type;
        this.connectionString = "jdbc:sqlite:" + sqlitePath;
        this.csvPath = csvPath;
        this.influxdbUrl = influxdbUrl;
        this.influxdbToken = influxdbToken;
        this.influxdbOrg = influxdbOrg;
        this.influxdbBucket = influxdbBucket;
        
        initialize();
    }

    private void initialize() {
        switch (type) {
            case "sqlite":
                initSqlite();
                break;
            case "csv":
                initCsv();
                break;
            case "influxdb":
                initInfluxdb();
                break;
            default:
                System.out.println("数据存储已禁用");
        }
    }

    private void initSqlite() {
        try {
            connection = DriverManager.getConnection(connectionString);
            Statement statement = connection.createStatement();
            statement.execute(
                "CREATE TABLE IF NOT EXISTS sensor_data (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "name TEXT NOT NULL, " +
                "slave_id INTEGER NOT NULL, " +
                "temperature REAL NOT NULL, " +
                "humidity REAL NOT NULL, " +
                "timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
            );
            statement.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_data(timestamp)");
            System.out.println("SQLite数据库已连接: " + connectionString);
        } catch (SQLException e) {
            System.out.println("警告: 无法连接SQLite数据库: " + e.getMessage());
        }
    }

    private void initCsv() {
        try {
            java.io.File file = new java.io.File(csvPath);
            if (!file.exists()) {
                FileWriter writer = new FileWriter(csvPath);
                writer.append("name,slave_id,temperature,humidity,timestamp\n");
                writer.flush();
                writer.close();
            }
            csvWriter = new FileWriter(csvPath, true);
            System.out.println("CSV文件已打开: " + csvPath);
        } catch (IOException e) {
            System.out.println("警告: 无法打开CSV文件: " + e.getMessage());
        }
    }

    private void initInfluxdb() {
        isInfluxdbConfigured = true;
        System.out.println("InfluxDB存储已配置 (当前仅支持配置，未实现HTTP请求)");
        System.out.println("  URL: " + influxdbUrl);
        System.out.println("  Bucket: " + influxdbBucket);
    }

    @Override
    public boolean save(com.modbus.data.SensorData data) {
        if (!data.isSuccess()) {
            return true;
        }

        try {
            switch (type) {
                case "sqlite":
                    return saveToSqlite(data);
                case "csv":
                    return saveToCsv(data);
                case "influxdb":
                    return saveToInfluxdb(data);
                default:
                    return true;
            }
        } catch (Exception e) {
            System.out.println("保存数据失败: " + e.getMessage());
            return false;
        }
    }

    private boolean saveToSqlite(com.modbus.data.SensorData data) throws SQLException {
        if (connection == null || connection.isClosed()) {
            return false;
        }

        String sql = "INSERT INTO sensor_data (name, slave_id, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)";
        PreparedStatement pstmt = connection.prepareStatement(sql);
        pstmt.setString(1, data.getName());
        pstmt.setInt(2, data.getSlaveId());
        pstmt.setDouble(3, data.getTemperature());
        pstmt.setDouble(4, data.getHumidity());
        pstmt.setString(5, data.getTimestamp().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        pstmt.executeUpdate();
        pstmt.close();
        return true;
    }

    private boolean saveToCsv(com.modbus.data.SensorData data) throws IOException {
        if (csvWriter == null) {
            return false;
        }

        String timestamp = data.getTimestamp().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        csvWriter.append(String.format("%s,%d,%.1f,%.1f,%s\n",
            data.getName(), data.getSlaveId(), data.getTemperature(), data.getHumidity(), timestamp));
        csvWriter.flush();
        return true;
    }

    private boolean saveToInfluxdb(com.modbus.data.SensorData data) {
        System.out.println("  [InfluxDB] 保存数据: " + data.getName() + 
            " - 温度: " + data.getTemperature() + ", 湿度: " + data.getHumidity());
        return true;
    }

    @Override
    public void close() {
        try {
            switch (type) {
                case "sqlite":
                    if (connection != null && !connection.isClosed()) {
                        connection.close();
                        System.out.println("SQLite数据库已关闭");
                    }
                    break;
                case "csv":
                    if (csvWriter != null) {
                        csvWriter.close();
                        System.out.println("CSV文件已关闭");
                    }
                    break;
                case "influxdb":
                    System.out.println("InfluxDB连接已关闭");
                    break;
            }
        } catch (Exception e) {
            System.out.println("关闭存储时发生错误: " + e.getMessage());
        }
    }
}
