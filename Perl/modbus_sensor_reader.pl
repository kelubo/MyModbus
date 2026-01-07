#!/usr/bin/env perl
use strict;
use warnings;
use lib 'lib';
use Config;
use MultiPortReader;
use DataStorage;
use Time::Piece;
use Getopt::Long;

my $config_file = 'config.json';
my $help = 0;

GetOptions(
    'config|c=s' => \$config_file,
    'help|h' => \$help
);

if ($help) {
    print "Modbus温湿度传感器读取程序 (Perl)\n";
    print "================================\n\n";
    print "用法: perl modbus_sensor_reader.pl [选项]\n\n";
    print "选项:\n";
    print "  -c, --config <文件>  配置文件路径 (默认: config.json)\n";
    print "  -h, --help           显示帮助信息\n\n";
    print "支持的存储类型: sqlite, csv, influxdb, none\n";
    exit 0;
}

print "Modbus温湿度传感器读取程序 (Perl)\n";
print "================================\n";

my $config = Config->load($config_file);
$config->print();

my $storage = DataStorage::create($config->get_storage_type, {
    sqlite_path => $config->get_sqlite_path,
    csv_path => $config->get_csv_path,
    influxdb_url => $config->get_influxdb_url,
    influxdb_token => $config->get_influxdb_token,
    influxdb_org => $config->get_influxdb_org,
    influxdb_bucket => $config->get_influxdb_bucket
});

$SIG{INT} = sub {
    print "\n收到中断信号，正在退出...\n";
    $running = 0;
};

$SIG{TERM} = sub {
    print "\n收到终止信号，正在退出...\n";
    $running = 0;
};

my $reader = MultiPortReader->new();

my $ports = $config->get_ports;
if (scalar @$ports == 0) {
    print "错误: 配置中没有串口信息\n";
    exit 1;
}

foreach my $port (@$ports) {
    unless ($reader->add_port_config($port)) {
        print "警告: 无法添加串口 $port->{name}\n";
    }
}

unless ($reader->connect_all) {
    print "错误: 无法连接任何串口\n";
    exit 1;
}

my $sensors = $config->get_sensors;
if (scalar @$sensors == 0) {
    print "错误: 配置中没有传感器信息\n";
    $reader->close;
    $storage->close;
    exit 1;
}

print "\n开始读取传感器数据...\n";

my $running = 1;
while ($running) {
    my $results = $reader->read_all_sensors($sensors);
    
    foreach my $result (@$results) {
        if ($result->{success}) {
            my $timestamp = localtime;
            my $record = {
                name => $result->{name},
                slave_id => $result->{slave_id},
                temperature => $result->{temperature},
                humidity => $result->{humidity},
                timestamp => $timestamp
            };
            
            printf "  [%s] %s [从站 %d]: 温度 %.1f°C, 湿度 %.1f%%\n",
                $timestamp->strftime('%Y-%m-%d %H:%M:%S'),
                $result->{name},
                $result->{slave_id},
                $result->{temperature},
                $result->{humidity};
            
            $storage->save($record);
        } else {
            print "  读取 $result->{name} 失败: $result->{error}\n";
        }
        
        select(undef, undef, undef, 0.1);
    }
    
    select(undef, undef, undef, $config->get_read_interval);
}

print "\n正在关闭程序...\n";
$reader->close;
$storage->close;
print "程序已退出\n";
