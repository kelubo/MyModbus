package DataStorage;

use strict;
use warnings;
use DBI;
use JSON;
use File::Basename;
use Time::Piece;

sub new {
    my ($class, $type, $config) = @_;
    my $self = {
        type => $type,
        config => $config,
        dbh => undef,
        csv_fh => undef
    };
    bless $self, $class;
    return $self;
}

sub create {
    my ($type, $config) = @_;
    
    if ($type eq 'sqlite') {
        return SQLiteStorage->new($config);
    } elsif ($type eq 'csv') {
        return CSVStorage->new($config);
    } elsif ($type eq 'influxdb') {
        return InfluxDBStorage->new($config);
    }
    
    return NoneStorage->new($config);
}

sub save {
    my ($self, $record) = @_;
    return 1;
}

sub close {
    my ($self) = @_;
}

package SQLiteStorage;

use parent -norequire, 'DataStorage';

sub new {
    my ($class, $config) = @_;
    my $self = $class->SUPER::new('sqlite', $config);
    
    my $db_path = $config->{sqlite_path} || 'sensor_data.db';
    
    eval {
        $self->{dbh} = DBI->connect(
            "dbi:SQLite:dbname=$db_path",
            "", "",
            { PrintError => 0, RaiseError => 0 }
        ) or die "无法连接SQLite数据库: " . DBI->errstr;
        
        $self->{dbh}->do("
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slave_id INTEGER NOT NULL,
                temperature REAL NOT NULL,
                humidity REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        $self->{dbh}->do("
            CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_data(timestamp)
        );
        
        print "SQLite数据库已连接: $db_path\n";
        1;
    } or do {
        print "警告: 无法连接SQLite数据库: $@\n";
        $self->{dbh} = undef;
    };
    
    bless $self, $class;
    return $self;
}

sub save {
    my ($self, $record) = @_;
    
    return 1 unless $self->{dbh};
    
    eval {
        my $sql = "INSERT INTO sensor_data (name, slave_id, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)";
        my $sth = $self->{dbh}->prepare($sql);
        $sth->execute(
            $record->{name},
            $record->{slave_id},
            $record->{temperature},
            $record->{humidity},
            $record->{timestamp}->strftime('%Y-%m-%d %H:%M:%S')
        );
        1;
    } or do {
        print "保存数据失败: $@\n";
        return 0;
    };
    
    return 1;
}

sub close {
    my ($self) = @_;
    if ($self->{dbh}) {
        $self->{dbh}->close;
        $self->{dbh} = undef;
        print "SQLite数据库已关闭\n";
    }
}

package CSVStorage;

use parent -norequire, 'DataStorage';

sub new {
    my ($class, $config) = @_;
    my $self = $class->SUPER::new('csv', $config);
    
    my $csv_path = $config->{csv_path} || 'sensor_data.csv';
    
    eval {
        if (!-e $csv_path) {
            open my $fh, '>', $csv_path or die "无法创建CSV文件: $csv_path";
            print $fh "name,slave_id,temperature,humidity,timestamp\n";
            close $fh;
        }
        
        open $self->{csv_fh}, '>>', $csv_path or die "无法打开CSV文件: $csv_path";
        $self->{csv_path} = $csv_path;
        print "CSV文件已打开: $csv_path\n";
        1;
    } or do {
        print "警告: 无法打开CSV文件: $@\n";
        $self->{csv_fh} = undef;
    };
    
    bless $self, $class;
    return $self;
}

sub save {
    my ($self, $record) = @_;
    
    return 1 unless $self->{csv_fh};
    
    eval {
        my $timestamp = $record->{timestamp}->strftime('%Y-%m-%d %H:%M:%S');
        print { $self->{csv_fh} } join(',',
            $record->{name},
            $record->{slave_id},
            $record->{temperature},
            $record->{humidity},
            $timestamp
        ) . "\n";
        $self->{csv_fh}->flush;
        1;
    } or do {
        print "写入CSV失败: $@\n";
        return 0;
    };
    
    return 1;
}

sub close {
    my ($self) = @_;
    if ($self->{csv_fh}) {
        close $self->{csv_fh};
        $self->{csv_fh} = undef;
        print "CSV文件已关闭\n";
    }
}

package InfluxDBStorage;

use parent -norequire, 'DataStorage';

sub new {
    my ($class, $config) = @_;
    my $self = $class->SUPER::new('influxdb', $config);
    
    $self->{url} = $config->{influxdb_url} || 'http://localhost:8086';
    $self->{token} = $config->{influxdb_token} || '';
    $self->{org} = $config->{influxdb_org} || '';
    $self->{bucket} = $config->{influxdb_bucket} || 'sensor-data';
    
    print "InfluxDB存储已配置 (当前仅支持配置，未实现HTTP请求)\n";
    print "  URL: $self->{url}\n";
    print "  Bucket: $self->{bucket}\n";
    
    bless $self, $class;
    return $self;
}

sub save {
    my ($self, $record) = @_;
    print "  [InfluxDB] 保存数据: $record->{name} - 温度: $record->{temperature}, 湿度: $record->{humidity}\n";
    return 1;
}

sub close {
    my ($self) = @_;
    print "InfluxDB连接已关闭\n";
}

package NoneStorage;

use parent -norequire, 'DataStorage';

sub new {
    my ($class, $config) = @_;
    my $self = $class->SUPER::new('none', $config);
    print "数据存储已禁用\n";
    bless $self, $class;
    return $self;
}

sub save {
    my ($self, $record) = @_;
    return 1;
}

sub close {
    my ($self) = @_;
}

1;
