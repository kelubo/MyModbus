package SensorReader;

use strict;
use warnings;
use Time::HiRes qw(usleep);

sub new {
    my ($class, $port, $baudrate, $data_bits, $stop_bits, $parity, $timeout) = @_;
    my $self = {
        port => $port,
        baudrate => $baudrate,
        data_bits => $data_bits,
        stop_bits => $stop_bits,
        parity => $parity,
        timeout => $timeout,
        serial => undef,
        is_open => 0
    };
    bless $self, $class;
    return $self;
}

sub open {
    my ($self) = @_;
    
    eval {
        if ($^O eq 'MSWin32') {
            require Win32::SerialPort;
            $self->{serial} = Win32::SerialPort->new($self->{port}) or die "无法打开串口: $self->{port}";
        } else {
            require Device::SerialPort;
            $self->{serial} = Device::SerialPort->new($self->{port}) or die "无法打开串口: $self->{port}";
        }
        1;
    } or do {
        print "错误: $@\n";
        return 0;
    };
    
    $self->{serial}->baudrate($self->{baudrate});
    $self->{serial}->databits($self->{data_bits});
    $self->{serial}->stopbits($self->{stop_bits});
    $self->{serial}->parity($self->{parity});
    $self->{serial}->read_char_time(0);
    $self->{serial}->read_const_time($self->{timeout} * 1000);
    
    $self->{serial}->write_settings or die "无法设置串口参数";
    $self->{is_open} = 1;
    
    print "串口 $self->{port} 已打开\n";
    return 1;
}

sub close {
    my ($self) = @_;
    if ($self->{is_open} && $self->{serial}) {
        $self->{serial}->close if $self->{serial};
        undef $self->{serial};
        $self->{is_open} = 0;
        print "串口已关闭\n";
    }
}

sub is_open {
    my ($self) = @_;
    return $self->{is_open};
}

sub _calculate_crc {
    my ($data) = @_;
    my $crc = 0xFFFF;
    
    for my $byte (unpack('C*', $data)) {
        $crc ^= $byte;
        for (1..8) {
            if ($crc & 0x0001) {
                $crc = ($crc >> 1) ^ 0xA001;
            } else {
                $crc >>= 1;
            }
        }
    }
    
    return pack('v', $crc);
}

sub _send_request {
    my ($self, $request) = @_;
    
    return 0 unless $self->{is_open};
    
    my $crc = _calculate_crc($request);
    my $full_request = $request . $crc;
    
    my $count = $self->{serial}->write($full_request);
    return 0 unless $count == length($full_request);
    
    return 1;
}

sub _read_response {
    my ($self, $expected_len) = @_;
    
    return undef unless $self->{is_open};
    
    my ($count, $data) = $self->{serial}->read(256);
    
    if ($count < $expected_len) {
        return undef;
    }
    
    return $data;
}

sub read_sensor_data {
    my ($self, $slave_id, $temp_reg, $humi_reg, $temp_scale, $humi_scale, $sensor_name) = @_;
    
    my %result = (
        name => $sensor_name,
        slave_id => $slave_id,
        temperature => 0,
        humidity => 0,
        success => 0,
        error => ''
    );
    
    unless ($self->{is_open}) {
        $result{error} = '串口未打开';
        return \%result;
    }
    
    my $request = pack('C4v', 0x01, 0x03, $temp_reg, 4);
    
    unless (_send_request($self, $request)) {
        $result{error} = '发送请求失败';
        return \%result;
    }
    
    usleep(50000);
    
    my $response = _read_response($self, 9);
    
    unless (defined $response && length($response) >= 5) {
        $result{error} = '读取响应超时或数据不完整';
        return \%result;
    }
    
    my @bytes = unpack('C*', $response);
    
    if ($bytes[0] != $slave_id || $bytes[1] != 0x03) {
        $result{error} = '响应帧格式错误';
        return \%result;
    }
    
    if ($bytes[2] != 4) {
        $result{error} = '数据长度错误';
        return \%result;
    }
    
    my $temp_raw = ($bytes[3] << 8) | $bytes[4];
    my $humi_raw = ($bytes[5] << 8) | $bytes[6];
    
    $result{temperature} = $temp_raw * $temp_scale;
    $result{humidity} = $humi_raw * $humi_scale;
    $result{success} = 1;
    
    return \%result;
}

sub DESTROY {
    my ($self) = @_;
    $self->close if $self->{is_open};
}

1;
