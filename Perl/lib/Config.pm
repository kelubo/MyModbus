package Config;

use strict;
use warnings;
use JSON;
use File::Basename;

sub new {
    my ($class) = @_;
    my $self = {
        modbus => {
            ports => [],
            read_interval => 2,
            sensors => []
        },
        storage => {
            type => 'sqlite',
            sqlite_path => 'sensor_data.db',
            influxdb_url => 'http://localhost:8086',
            influxdb_token => '',
            influxdb_org => '',
            influxdb_bucket => 'sensor-data',
            csv_path => 'sensor_data.csv'
        }
    };
    bless $self, $class;
    return $self;
}

sub load {
    my ($class, $filename) = @_;
    my $self = $class->new();
    
    if (-e $filename) {
        eval {
            open my $fh, '<', $filename or die "无法打开配置文件: $filename";
            my $json_text = do { local $/; <$fh> };
            close $fh;
            
            my $data = decode_json($json_text);
            $self->_parse_config($data);
            1;
        } or do {
            print "加载配置文件失败: $@\n";
            print "使用默认配置\n";
            $self->_apply_defaults();
        };
    } else {
        print "配置文件 $filename 不存在，使用默认配置\n";
        $self->_apply_defaults();
    }
    
    return $self;
}

sub _parse_config {
    my ($self, $data) = @_;
    
    if (exists $data->{ports} && ref($data->{ports}) eq 'ARRAY') {
        $self->{modbus}{ports} = [];
        foreach my $port (@{$data->{ports}}) {
            push @{$self->{modbus}{ports}}, {
                name => $port->{name} || '未知串口',
                port => $port->{port} || '',
                baudrate => $port->{baudrate} || 9600,
                data_bits => $port->{data_bits} || 8,
                stop_bits => $port->{stop_bits} || 1,
                parity => $port->{parity} || 'N',
                timeout => $port->{timeout} || 1.0
            };
        }
    }
    
    if (exists $data->{read_interval}) {
        $self->{modbus}{read_interval} = $data->{read_interval};
    }
    
    if (exists $data->{sensors} && ref($data->{sensors}) eq 'ARRAY') {
        $self->{modbus}{sensors} = [];
        foreach my $sensor (@{$data->{sensors}}) {
            push @{$self->{modbus}{sensors}}, {
                name => $sensor->{name} || '未知传感器',
                slave_id => $sensor->{slave_id} || 1,
                temp_reg => $sensor->{temp_reg} || 0,
                humi_reg => $sensor->{humi_reg} || 1,
                temp_scale => $sensor->{temp_scale} || 0.1,
                humi_scale => $sensor->{humi_scale} || 0.1,
                port_name => $sensor->{port_name} || ''
            };
        }
    }
    
    if (exists $data->{storage_type}) {
        $self->{storage}{type} = $data->{storage_type};
    }
    if (exists $data->{storage_sqlite_path}) {
        $self->{storage}{sqlite_path} = $data->{storage_sqlite_path};
    }
    if (exists $data->{storage_influxdb_url}) {
        $self->{storage}{influxdb_url} = $data->{storage_influxdb_url};
    }
    if (exists $data->{storage_influxdb_token}) {
        $self->{storage}{influxdb_token} = $data->{storage_influxdb_token};
    }
    if (exists $data->{storage_influxdb_org}) {
        $self->{storage}{influxdb_org} = $data->{storage_influxdb_org};
    }
    if (exists $data->{storage_influxdb_bucket}) {
        $self->{storage}{influxdb_bucket} = $data->{storage_influxdb_bucket};
    }
    if (exists $data->{storage_csv_path}) {
        $self->{storage}{csv_path} = $data->{storage_csv_path};
    }
    
    $self->_apply_defaults();
}

sub _apply_defaults {
    my ($self) = @_;
    
    my $os = $^O;
    my $default_port = ($os eq 'MSWin32') ? 'COM1' : '/dev/ttyUSB0';
    
    if (scalar @{$self->{modbus}{ports}} == 0) {
        push @{$self->{modbus}{ports}}, {
            name => ($os eq 'MSWin32') ? 'COM1' : 'ttyUSB0',
            port => $default_port,
            baudrate => 9600,
            data_bits => 8,
            stop_bits => 1,
            parity => 'N',
            timeout => 1.0
        };
    }
    
    $self->{modbus}{read_interval} = 2 if $self->{modbus}{read_interval} == 0;
    
    foreach my $port (@{$self->{modbus}{ports}}) {
        $port->{baudrate} = 9600 if $port->{baudrate} == 0;
        $port->{data_bits} = 8 if $port->{data_bits} == 0;
        $port->{stop_bits} = 1 if $port->{stop_bits} == 0;
        $port->{parity} = 'N' if $port->{parity} eq '';
        $port->{timeout} = 1.0 if $port->{timeout} == 0;
    }
    
    foreach my $sensor (@{$self->{modbus}{sensors}}) {
        $sensor->{temp_scale} = 0.1 if $sensor->{temp_scale} == 0;
        $sensor->{humi_scale} = 0.1 if $sensor->{humi_scale} == 0;
        if ($sensor->{port_name} eq '' && scalar @{$self->{modbus}{ports}} > 0) {
            $sensor->{port_name} = $self->{modbus}{ports}[0]{name};
        }
    }
    
    $self->{storage}{type} = 'sqlite' if $self->{storage}{type} eq '';
    $self->{storage}{sqlite_path} = 'sensor_data.db' if $self->{storage}{sqlite_path} eq '';
    $self->{storage}{csv_path} = 'sensor_data.csv' if $self->{storage}{csv_path} eq '';
    $self->{storage}{influxdb_url} = 'http://localhost:8086' if $self->{storage}{influxdb_url} eq '';
}

sub print {
    my ($self) = @_;
    
    print "配置信息:\n";
    
    my $port_count = scalar @{$self->{modbus}{ports}};
    print "  串口数量: $port_count\n";
    
    for my $i (0..$#{$self->{modbus}{ports}}) {
        my $port = $self->{modbus}{ports}[$i];
        print "  串口$i: $port->{name} ($port->{port})\n";
        print "    波特率: $port->{baudrate}, 数据位: $port->{data_bits}, 停止位: $port->{stop_bits}, 校验: $port->{parity}\n";
    }
    
    print "  读取间隔: $self->{modbus}{read_interval}秒\n";
    
    my $type_str = $self->{storage}{type};
    $type_str = 'SQLite' if $type_str eq 'sqlite';
    $type_str = 'InfluxDB' if $type_str eq 'influxdb';
    $type_str = 'CSV' if $type_str eq 'csv';
    $type_str = 'None' if $type_str eq 'none';
    print "  存储类型: $type_str\n";
    
    my $sensor_count = scalar @{$self->{modbus}{sensors}};
    print "  传感器数量: $sensor_count\n";
    
    for my $i (0..$#{$self->{modbus}{sensors}}) {
        my $sensor = $self->{modbus}{sensors}[$i];
        printf "  传感器%d: %s (从站地址: %d, 串口: %s, 温度寄存器: 0x%04X, 湿度寄存器: 0x%04X)\n",
            $i + 1, $sensor->{name}, $sensor->{slave_id}, $sensor->{port_name}, $sensor->{temp_reg}, $sensor->{humi_reg};
    }
}

sub get_ports { shift->{modbus}{ports} }
sub get_read_interval { shift->{modbus}{read_interval} }
sub get_sensors { shift->{modbus}{sensors} }
sub get_storage_type { shift->{storage}{type} }
sub get_sqlite_path { shift->{storage}{sqlite_path} }
sub get_influxdb_url { shift->{storage}{influxdb_url} }
sub get_influxdb_token { shift->{storage}{influxdb_token} }
sub get_influxdb_org { shift->{storage}{influxdb_org} }
sub get_influxdb_bucket { shift->{storage}{influxdb_bucket} }
sub get_csv_path { shift->{storage}{csv_path} }

1;
