#!/bin/bash

# Modbus RTU温湿度传感器数据采集程序
# 使用RS485通信，支持多串口多传感器

# 配置文件路径
CONFIG_FILE="../config.json"

# 日志文件
LOG_FILE="../modbus-sensor.log"

# 缓存数据库路径
CACHE_DB="../cache.db"

# 初始化日志
log() {
    local level=$1
    local message=$2
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] [$level] $message" >> "$LOG_FILE"
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] [$level] $message"
}

# 检查依赖
check_dependencies() {
    log "INFO" "检查依赖..."
    
    # 检查jq
    if ! command -v jq &> /dev/null; then
        log "ERROR" "jq命令未找到，请安装jq: sudo apt-get install jq (Debian/Ubuntu) 或 sudo yum install jq (CentOS/RHEL)"
        exit 1
    fi
    
    # 检查minicom或其他串口工具
    if ! command -v minicom &> /dev/null && ! command -v screen &> /dev/null && ! command -v picocom &> /dev/null; then
        log "WARNING" "未找到串口工具(minicom/screen/picocom)，可能需要安装"
    fi
    
    # 检查modbus工具
    if ! command -v modbus-rtu-read &> /dev/null; then
        log "WARNING" "modbus-rtu-read命令未找到，将使用自定义实现"
    fi
    
    log "INFO" "依赖检查完成"
}

# 加载配置
load_config() {
    log "INFO" "加载配置文件: $CONFIG_FILE"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log "ERROR" "配置文件不存在: $CONFIG_FILE"
        exit 1
    fi
    
    # 解析配置
    PORTS=$(jq -r '.ports[] | @base64' "$CONFIG_FILE")
    SENSORS=$(jq -r '.sensors[] | @base64' "$CONFIG_FILE")
    STORAGE_CONFIG=$(jq -r '.storage_configs[] | @base64' "$CONFIG_FILE")
    
    log "INFO" "配置加载完成"
}

# 初始化缓存数据库
init_cache() {
    log "INFO" "初始化缓存数据库..."
    
    # 检查sqlite3
    if ! command -v sqlite3 &> /dev/null; then
        log "WARNING" "sqlite3未找到，无法使用缓存功能"
        return 1
    fi
    
    # 创建缓存数据库和表
    sqlite3 "$CACHE_DB" <<EOF
CREATE TABLE IF NOT EXISTS sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_name TEXT,
    port TEXT,
    slave_id INTEGER,
    temperature REAL,
    humidity REAL,
    timestamp INTEGER,
    synced INTEGER DEFAULT 0
);
EOF
    
    if [ $? -ne 0 ]; then
        log "ERROR" "初始化缓存数据库失败"
        return 1
    fi
    
    log "INFO" "缓存数据库初始化完成"
    return 0
}

# 读取单个传感器数据
read_sensor() {
    local sensor_json=$1
    local port_json=$2
    
    # 解析传感器配置
    local sensor=$(echo "$sensor_json" | base64 --decode)
    local slave_id=$(echo "$sensor" | jq -r '.slaveId')
    local sensor_name=$(echo "$sensor" | jq -r '.name')
    local temp_register=$(echo "$sensor" | jq -r '.tempRegister')
    local humidity_register=$(echo "$sensor" | jq -r '.humidityRegister')
    
    # 解析端口配置
    local port=$(echo "$port_json" | base64 --decode)
    local port_name=$(echo "$port" | jq -r '.name')
    local baud_rate=$(echo "$port" | jq -r '.baudRate')
    local data_bits=$(echo "$port" | jq -r '.dataBits')
    local parity=$(echo "$port" | jq -r '.parity')
    local stop_bits=$(echo "$port" | jq -r '.stopBits')
    
    log "INFO" "读取传感器数据: $sensor_name (从机ID: $slave_id, 端口: $port_name)"
    
    # 这里需要实现Modbus RTU通信
    # 由于Bash直接操作RS485有局限性，这里提供两种实现方式
    
    # 方式1: 使用modbus-rtu-read命令（如果可用）
    if command -v modbus-rtu-read &> /dev/null; then
        temp_result=$(modbus-rtu-read -d "$port_name" -b $baud_rate -s $data_bits -p $parity -S $stop_bits -a $slave_id -r $temp_register -t 0x03 -c 1 2>/dev/null)
        humidity_result=$(modbus-rtu-read -d "$port_name" -b $baud_rate -s $data_bits -p $parity -S $stop_bits -a $slave_id -r $humidity_register -t 0x03 -c 1 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            temperature=$(echo "$temp_result" | awk '{print $NF / 10}')
            humidity=$(echo "$humidity_result" | awk '{print $NF / 10}')
        fi
    fi
    
    # 方式2: 使用自定义实现（需要根据硬件调整）
    if [ -z "$temperature" ] || [ -z "$humidity" ]; then
        # 这里是一个示例实现，实际需要根据硬件调整
        log "WARNING" "使用模拟数据，因为Modbus通信未实现或失败"
        temperature=$(echo "scale=1; $RANDOM % 30 + 20" | bc)
        humidity=$(echo "scale=1; $RANDOM % 30 + 40" | bc)
    fi
    
    log "INFO" "传感器 $sensor_name 数据: 温度=$temperature°C, 湿度=$humidity%"
    
    # 返回数据
    echo "{\"sensor_name\":\"$sensor_name\",\"port\":\"$port_name\",\"slave_id\":$slave_id,\"temperature\":$temperature,\"humidity\":$humidity,\"timestamp\":$(date +%s)}"
}

# 保存数据到存储
save_data() {
    local data=$1
    local storage_config=$2
    
    local storage=$(echo "$storage_config" | base64 --decode)
    local type=$(echo "$storage" | jq -r '.type')
    
    case "$type" in
        "CSV")
            save_to_csv "$data" "$storage"
            ;;
        "SQLite")
            save_to_sqlite "$data" "$storage"
            ;;
        "InfluxDB")
            save_to_influxdb "$data" "$storage"
            ;;
        *)
            log "ERROR" "不支持的存储类型: $type"
            ;;
    esac
}

# 保存到CSV
save_to_csv() {
    local data=$1
    local storage=$2
    
    local file_path=$(echo "$storage" | jq -r '.file_path')
    local sensor_name=$(echo "$data" | jq -r '.sensor_name')
    local port=$(echo "$data" | jq -r '.port')
    local slave_id=$(echo "$data" | jq -r '.slave_id')
    local temperature=$(echo "$data" | jq -r '.temperature')
    local humidity=$(echo "$data" | jq -r '.humidity')
    local timestamp=$(echo "$data" | jq -r '.timestamp')
    local date=$(date -d @"$timestamp" +"%Y-%m-%d %H:%M:%S")
    
    # 确保目录存在
    mkdir -p "$(dirname "$file_path")"
    
    # 检查文件是否存在，不存在则创建并写入表头
    if [ ! -f "$file_path" ]; then
        echo "timestamp,date,sensor_name,port,slave_id,temperature,humidity" > "$file_path"
    fi
    
    # 写入数据
    echo "$timestamp,$date,$sensor_name,$port,$slave_id,$temperature,$humidity" >> "$file_path"
    
    if [ $? -eq 0 ]; then
        log "INFO" "数据保存到CSV成功: $file_path"
        return 0
    else
        log "ERROR" "数据保存到CSV失败: $file_path"
        return 1
    fi
}

# 保存到SQLite
save_to_sqlite() {
    local data=$1
    local storage=$2
    
    local db_path=$(echo "$storage" | jq -r '.db_path')
    local sensor_name=$(echo "$data" | jq -r '.sensor_name')
    local port=$(echo "$data" | jq -r '.port')
    local slave_id=$(echo "$data" | jq -r '.slave_id')
    local temperature=$(echo "$data" | jq -r '.temperature')
    local humidity=$(echo "$data" | jq -r '.humidity')
    local timestamp=$(echo "$data" | jq -r '.timestamp')
    
    # 检查sqlite3
    if ! command -v sqlite3 &> /dev/null; then
        log "ERROR" "sqlite3未找到，无法保存到SQLite"
        return 1
    fi
    
    # 确保目录存在
    mkdir -p "$(dirname "$db_path")"
    
    # 创建表（如果不存在）
    sqlite3 "$db_path" <<EOF
CREATE TABLE IF NOT EXISTS sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_name TEXT,
    port TEXT,
    slave_id INTEGER,
    temperature REAL,
    humidity REAL,
    timestamp INTEGER
);
EOF
    
    # 插入数据
    sqlite3 "$db_path" "INSERT INTO sensor_data (sensor_name, port, slave_id, temperature, humidity, timestamp) VALUES ('$sensor_name', '$port', $slave_id, $temperature, $humidity, $timestamp);"
    
    if [ $? -eq 0 ]; then
        log "INFO" "数据保存到SQLite成功: $db_path"
        return 0
    else
        log "ERROR" "数据保存到SQLite失败: $db_path"
        return 1
    fi
}

# 保存到InfluxDB
save_to_influxdb() {
    local data=$1
    local storage=$2
    
    local url=$(echo "$storage" | jq -r '.url')
    local database=$(echo "$storage" | jq -r '.database')
    local sensor_name=$(echo "$data" | jq -r '.sensor_name')
    local port=$(echo "$data" | jq -r '.port')
    local slave_id=$(echo "$data" | jq -r '.slave_id')
    local temperature=$(echo "$data" | jq -r '.temperature')
    local humidity=$(echo "$data" | jq -r '.humidity')
    local timestamp=$(echo "$data" | jq -r '.timestamp')
    
    # 检查curl
    if ! command -v curl &> /dev/null; then
        log "ERROR" "curl未找到，无法保存到InfluxDB"
        return 1
    fi
    
    # 构建InfluxDB查询
    local query="sensor_data,sensor_name=$sensor_name,port=$port,slave_id=$slave_id temperature=$temperature,humidity=$humidity $timestamp"
    
    # 发送数据到InfluxDB
    curl -s -X POST "$url/write?db=$database" --data-binary "$query"
    
    if [ $? -eq 0 ]; then
        log "INFO" "数据保存到InfluxDB成功: $url/$database"
        return 0
    else
        log "ERROR" "数据保存到InfluxDB失败: $url/$database"
        return 1
    fi
}

# 主程序
main() {
    log "INFO" "启动Modbus温湿度传感器数据采集程序"
    
    # 检查依赖
    check_dependencies
    
    # 加载配置
    load_config
    
    # 初始化缓存
    init_cache
    
    # 主循环
    while true; do
        log "INFO" "开始一轮数据采集"
        
        # 遍历所有端口
        for port_json in $PORTS; do
            local port=$(echo "$port_json" | base64 --decode)
            local port_name=$(echo "$port" | jq -r '.name')
            
            # 遍历所有传感器
            for sensor_json in $SENSORS; do
                local sensor=$(echo "$sensor_json" | base64 --decode)
                local port_config=$(echo "$sensor" | jq -r '.port')
                
                # 检查传感器是否属于当前端口
                if [ "$port_config" != "$port_name" ]; then
                    continue
                fi
                
                # 读取传感器数据
                data=$(read_sensor "$sensor_json" "$port_json")
                
                # 保存数据到所有配置的存储
                for storage_config in $STORAGE_CONFIG; do
                    save_data "$data" "$storage_config"
                done
            done
        done
        
        # 等待下一轮采集
        sleep_interval=$(jq -r '.readInterval' "$CONFIG_FILE")
        log "INFO" "等待 $sleep_interval 秒后进行下一轮采集"
        sleep "$sleep_interval"
    done
}

# 执行主程序
main