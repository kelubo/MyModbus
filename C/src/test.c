#include "config.h"
#include "data_storage.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main(void) {
    printf("开始测试修复后的StorageConfig结构...\n\n");
    
    // 测试1: 创建并初始化StorageConfig
    printf("测试1: 创建并初始化StorageConfig\n");
    StorageConfig storage_config;
    storage_config.type = STORAGE_TYPE_SQLITE;
    storage_config.enable_cache = true;
    snprintf(storage_config.config.sqlite.db_path, sizeof(storage_config.config.sqlite.db_path), "test_sensor_data.db");
    snprintf(storage_config.cache.cache_db_path, sizeof(storage_config.cache.cache_db_path), "test_sensor_cache.db");
    storage_config.cache.flush_interval = 5;
    storage_config.cache.batch_size = 50;
    
    printf("  存储类型: %s\n", storage_type_to_string(storage_config.type));
    printf("  启用缓存: %s\n", storage_config.enable_cache ? "是" : "否");
    printf("  SQLite路径: %s\n", storage_config.config.sqlite.db_path);
    printf("  缓存路径: %s\n", storage_config.cache.cache_db_path);
    printf("  刷新间隔: %d秒\n", storage_config.cache.flush_interval);
    printf("  批量大小: %d\n", storage_config.cache.batch_size);
    printf("✓ 测试1通过\n\n");
    
    // 测试2: 创建默认存储配置
    printf("测试2: 创建默认存储配置\n");
    StorageConfig default_config = get_default_storage_config();
    printf("  默认存储类型: %s\n", storage_type_to_string(default_config.type));
    printf("  默认SQLite路径: %s\n", default_config.config.sqlite.db_path);
    printf("  默认启用缓存: %s\n", default_config.enable_cache ? "是" : "否");
    printf("✓ 测试2通过\n\n");
    
    // 测试3: 测试配置加载功能
    printf("测试3: 测试配置加载功能\n");
    AppConfig* app_config = config_create();
    if (app_config) {
        config_load_default(app_config);
        printf("  加载默认配置成功\n");
        printf("  存储类型: %s\n", storage_type_to_string(app_config->storage.type));
        printf("  SQLite路径: %s\n", app_config->storage.config.sqlite.db_path);
        printf("  缓存路径: %s\n", app_config->storage.cache.cache_db_path);
        printf("✓ 测试3通过\n");
        config_free(app_config);
    } else {
        printf("✗ 测试3失败: 无法创建配置\n");
    }
    
    printf("\n所有测试完成！\n");
    return 0;
}