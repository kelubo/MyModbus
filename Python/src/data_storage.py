#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
数据存储模块
支持SQLite、InfluxDB、CSV三种存储方式
支持本地缓存，确保数据库不可用时数据不丢失
"""

import csv
import sqlite3
import json
import os
import threading
import queue
import time
from datetime import datetime
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from pathlib import Path


class DataStorage(ABC):
    """数据存储抽象基类"""

    @abstractmethod
    def save(self, sensor_name: str, slave_id: int, temperature: float, humidity: float):
        pass

    @abstractmethod
    def save_batch(self, data: List[Dict[str, Any]]):
        pass

    @abstractmethod
    def close(self):
        pass


class CachedStorage(DataStorage):
    """带本地缓存的存储，确保数据不丢失"""

    def __init__(
        self,
        target_storage: DataStorage,
        cache_db_path: str = "sensor_cache.db",
        flush_interval: int = 10,
        batch_size: int = 100
    ):
        self.target_storage = target_storage
        self.cache_db_path = cache_db_path
        self.flush_interval = flush_interval
        self.batch_size = batch_size
        self.running = True
        self.cache_queue = queue.Queue()
        self.lock = threading.Lock()

        self._init_cache_db()
        self._start_flush_thread()

    def _init_cache_db(self):
        self.cache_conn = sqlite3.connect(self.cache_db_path, check_same_thread=False)
        self.cache_conn.row_factory = sqlite3.Row
        cursor = self.cache_conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS data_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_name TEXT NOT NULL,
                slave_id INTEGER,
                temperature REAL,
                humidity REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                retry_count INTEGER DEFAULT 0
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_processed ON data_cache(retry_count)')
        self.cache_conn.commit()

    def _start_flush_thread(self):
        self.flush_thread = threading.Thread(target=self._flush_worker, daemon=True)
        self.flush_thread.start()

    def _flush_worker(self):
        while self.running:
            try:
                time.sleep(self.flush_interval)
                self._flush_cache()
            except Exception as e:
                print(f"[缓存] 刷新线程错误: {e}")

    def _flush_cache(self):
        with self.lock:
            try:
                cursor = self.cache_conn.cursor()
                cursor.execute(
                    'SELECT * FROM data_cache WHERE retry_count < 10 ORDER BY id LIMIT ?',
                    (self.batch_size,)
                )
                records = cursor.fetchall()

                if not records:
                    return

                print(f"[缓存] 发现 {len(records)} 条待同步数据")

                for row in records:
                    try:
                        record = {
                            'sensor_name': row['sensor_name'],
                            'slave_id': row['slave_id'],
                            'temperature': row['temperature'],
                            'humidity': row['humidity'],
                            'timestamp': datetime.now()
                        }
                        self.target_storage.save(
                            record['sensor_name'],
                            record['slave_id'],
                            record['temperature'],
                            record['humidity']
                        )
                        cursor.execute('DELETE FROM data_cache WHERE id = ?', (row['id'],))
                        print(f"[缓存] 同步成功: {record['sensor_name']}")
                    except Exception as e:
                        cursor.execute(
                            'UPDATE data_cache SET retry_count = retry_count + 1 WHERE id = ?',
                            (row['id'],)
                        )
                        print(f"[缓存] 同步失败: {e}")

                self.cache_conn.commit()
            except Exception as e:
                print(f"[缓存] 刷新缓存失败: {e}")

    def save(self, sensor_name: str, slave_id: int, temperature: float, humidity: float):
        try:
            cursor = self.cache_conn.cursor()
            cursor.execute(
                'INSERT INTO data_cache (sensor_name, slave_id, temperature, humidity) VALUES (?, ?, ?, ?)',
                (sensor_name, slave_id, temperature, humidity)
            )
            self.cache_conn.commit()
            print(f"[缓存] 数据已保存到本地缓存: {sensor_name} - 温度{temperature}, 湿度{humidity}")

            try:
                self.target_storage.save(sensor_name, slave_id, temperature, humidity)
                cursor.execute(
                    'DELETE FROM data_cache WHERE sensor_name = ? AND slave_id = ? AND temperature = ? AND humidity = ? AND retry_count = 0',
                    (sensor_name, slave_id, temperature, humidity)
                )
                self.cache_conn.commit()
                print(f"[缓存] 实时同步成功: {sensor_name}")
            except Exception as e:
                print(f"[缓存] 实时同步失败，将稍后重试: {e}")

        except Exception as e:
            print(f"[缓存] 保存到缓存失败: {e}")

    def save_batch(self, data: List[Dict[str, Any]]):
        with self.lock:
            try:
                cursor = self.cache_conn.cursor()
                for item in data:
                    cursor.execute(
                        'INSERT INTO data_cache (sensor_name, slave_id, temperature, humidity) VALUES (?, ?, ?, ?)',
                        (item['sensor_name'], item['slave_id'], item['temperature'], item['humidity'])
                    )
                self.cache_conn.commit()
                print(f"[缓存] 批量数据已保存到本地缓存: {len(data)} 条")

                self._flush_cache()

            except Exception as e:
                print(f"[缓存] 批量保存到缓存失败: {e}")

    def get_cache_stats(self) -> Dict[str, Any]:
        cursor = self.cache_conn.cursor()
        cursor.execute('SELECT COUNT(*) as count FROM data_cache')
        total = cursor.fetchone()['count']
        cursor.execute('SELECT COUNT(*) as count FROM data_cache WHERE retry_count > 0')
        failed = cursor.fetchone()['count']
        return {
            'total_cached': total,
            'failed_count': failed,
            'cache_db': self.cache_db_path
        }

    def sync_all(self):
        print("[缓存] 手动触发全量同步...")
        self._flush_cache()

    def close(self):
        self.running = False
        self._flush_cache()
        if self.cache_conn:
            self.cache_conn.close()
        if self.target_storage:
            self.target_storage.close()


class SQLiteStorage(DataStorage):
    """SQLite存储"""

    def __init__(self, db_path: str = "sensor_data.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_table()

    def _create_table(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                sensor_name TEXT NOT NULL,
                slave_id INTEGER,
                temperature REAL,
                humidity REAL
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_data(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sensor_name ON sensor_data(sensor_name)')
        self.conn.commit()

    def save(self, sensor_name: str, slave_id: int, temperature: float, humidity: float):
        cursor = self.conn.cursor()
        cursor.execute(
            'INSERT INTO sensor_data (sensor_name, slave_id, temperature, humidity) VALUES (?, ?, ?, ?)',
            (sensor_name, slave_id, temperature, humidity)
        )
        self.conn.commit()

    def save_batch(self, data: List[Dict[str, Any]]):
        cursor = self.conn.cursor()
        cursor.executemany(
            'INSERT INTO sensor_data (sensor_name, slave_id, temperature, humidity) VALUES (?, ?, ?, ?)',
            [(item['sensor_name'], item['slave_id'], item['temperature'], item['humidity']) for item in data]
        )
        self.conn.commit()

    def query(self, limit: int = 100, offset: int = 0) -> List[sqlite3.Row]:
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT ? OFFSET ?', (limit, offset))
        return cursor.fetchall()

    def query_by_time_range(self, start_time: str, end_time: str) -> List[sqlite3.Row]:
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT * FROM sensor_data WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp',
            (start_time, end_time)
        )
        return cursor.fetchall()

    def query_by_sensor(self, sensor_name: str, limit: int = 100) -> List[sqlite3.Row]:
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT * FROM sensor_data WHERE sensor_name = ? ORDER BY timestamp DESC LIMIT ?',
            (sensor_name, limit)
        )
        return cursor.fetchall()

    def get_stats(self) -> Dict[str, Any]:
        cursor = self.conn.cursor()
        cursor.execute('SELECT COUNT(*) as count FROM sensor_data')
        count = cursor.fetchone()['count']
        cursor.execute('SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM sensor_data')
        time_range = cursor.fetchone()
        return {
            'total_records': count,
            'earliest': time_range['earliest'],
            'latest': time_range['latest']
        }

    def close(self):
        if self.conn:
            self.conn.close()


class InfluxDBStorage(DataStorage):
    """InfluxDB时序数据库存储"""

    def __init__(
        self,
        url: str = "http://localhost:8086",
        token: str = "my-token",
        org: str = "my-org",
        bucket: str = "sensor-data"
    ):
        self.url = url
        self.token = token
        self.org = org
        self.bucket = bucket
        self.client = None
        self.write_api = None
        self._connect()

    def _connect(self):
        try:
            from influxdb_client import InfluxDBClient
            from influxdb_client.client.write_api import SYNCHRONOUS

            self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
            self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        except ImportError:
            print("警告: influxdb-client未安装，请运行: pip install influxdb-client")

    def save(self, sensor_name: str, slave_id: int, temperature: float, humidity: float):
        if not self.write_api:
            raise Exception("InfluxDB客户端未初始化")

        try:
            from influxdb_client import Point

            point = (
                Point("sensor_data")
                .tag("sensor", sensor_name)
                .tag("slave_id", str(slave_id))
                .field("temperature", temperature)
                .field("humidity", humidity)
            )
            self.write_api.write(bucket=self.bucket, org=self.org, record=point)
        except Exception as e:
            raise Exception(f"InfluxDB写入失败: {e}")

    def save_batch(self, data: List[Dict[str, Any]]):
        if not self.write_api:
            raise Exception("InfluxDB客户端未初始化")

        try:
            from influxdb_client import Point

            points = []
            for item in data:
                points.append(
                    Point("sensor_data")
                    .tag("sensor", item['sensor_name'])
                    .tag("slave_id", str(item['slave_id']))
                    .field("temperature", item['temperature'])
                    .field("humidity", item['humidity'])
                )
            self.write_api.write(bucket=self.bucket, org=self.org, record=points)
        except Exception as e:
            raise Exception(f"InfluxDB批量写入失败: {e}")

    def close(self):
        if self.client:
            self.client.close()


class CSVStorage(DataStorage):
    """CSV文件存储"""

    def __init__(self, file_path: str = None):
        if file_path is None:
            file_path = f"sensor_data_{datetime.now().strftime('%Y%m%d')}.csv"
        self.file_path = file_path
        self._create_file()

    def _create_file(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'sensor_name', 'slave_id', 'temperature', 'humidity'])

    def save(self, sensor_name: str, slave_id: int, temperature: float, humidity: float):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(self.file_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, sensor_name, slave_id, temperature, humidity])

    def save_batch(self, data: List[Dict[str, Any]]):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(self.file_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for item in data:
                writer.writerow([timestamp, item['sensor_name'], item['slave_id'],
                                item['temperature'], item['humidity']])

    def query(self, limit: int = 100) -> List[Dict[str, Any]]:
        results = []
        with open(self.file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                results.append(row)
                if len(results) >= limit:
                    break
        return results

    def get_stats(self) -> Dict[str, Any]:
        if not os.path.exists(self.file_path):
            return {'total_records': 0}
        with open(self.file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)
            count = sum(1 for _ in reader)
        return {'total_records': count}

    def close(self):
        pass


class StorageFactory:
    """存储工厂类"""

    STORAGE_TYPES = {
        'sqlite': SQLiteStorage,
        'influxdb': InfluxDBStorage,
        'csv': CSVStorage,
        'none': type(None)
    }

    @staticmethod
    def create_storage(storage_type: str, use_cache: bool = True, **kwargs) -> DataStorage:
        """
        创建存储实例

        :param storage_type: 存储类型 ('sqlite', 'influxdb', 'csv', 'none')
        :param use_cache: 是否使用本地缓存确保数据不丢失
        :param kwargs: 存储配置参数
        :return: 存储实例
        """
        storage_type = storage_type.lower()

        if storage_type == 'none' or storage_type == 'disabled':
            return None

        if storage_type not in StorageFactory.STORAGE_TYPES:
            print(f"警告: 未知的存储类型 '{storage_type}'，使用SQLite")
            storage_type = 'sqlite'

        storage_class = StorageFactory.STORAGE_TYPES[storage_type]
        target_storage = storage_class(**kwargs)

        if use_cache and storage_type != 'csv':
            print(f"[存储] 启用本地缓存保护，目标类型: {storage_type}")
            cache_db = kwargs.get('cache_db_path', 'sensor_cache.db')
            return CachedStorage(target_storage, cache_db_path=cache_db)

        return target_storage

    @staticmethod
    def get_available_types() -> List[str]:
        """获取可用的存储类型"""
        return list(StorageFactory.STORAGE_TYPES.keys())


def get_storage_config() -> Dict[str, Any]:
    """获取默认存储配置"""
    return {
        'type': 'sqlite',
        'use_cache': True,
        'sqlite': {
            'db_path': 'sensor_data.db'
        },
        'influxdb': {
            'url': 'http://localhost:8086',
            'token': 'my-token',
            'org': 'my-org',
            'bucket': 'sensor-data'
        },
        'csv': {
            'file_path': None
        }
    }
