package com.modbus.config;

public class StorageConfig {
    private String type;
    private String sqlitePath;
    private String influxdbUrl;
    private String influxdbToken;
    private String influxdbOrg;
    private String influxdbBucket;
    private String csvPath;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSqlitePath() {
        return sqlitePath;
    }

    public void setSqlitePath(String sqlitePath) {
        this.sqlitePath = sqlitePath;
    }

    public String getInfluxdbUrl() {
        return influxdbUrl;
    }

    public void setInfluxdbUrl(String influxdbUrl) {
        this.influxdbUrl = influxdbUrl;
    }

    public String getInfluxdbToken() {
        return influxdbToken;
    }

    public void setInfluxdbToken(String influxdbToken) {
        this.influxdbToken = influxdbToken;
    }

    public String getInfluxdbOrg() {
        return influxdbOrg;
    }

    public void setInfluxdbOrg(String influxdbOrg) {
        this.influxdbOrg = influxdbOrg;
    }

    public String getInfluxdbBucket() {
        return influxdbBucket;
    }

    public void setInfluxdbBucket(String influxdbBucket) {
        this.influxdbBucket = influxdbBucket;
    }

    public String getCsvPath() {
        return csvPath;
    }

    public void setCsvPath(String csvPath) {
        this.csvPath = csvPath;
    }
}
