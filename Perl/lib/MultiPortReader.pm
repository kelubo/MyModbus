package MultiPortReader;

use strict;
use warnings;
use SensorReader;

sub new {
    my ($class) = @_;
    my $self = {
        readers => [],
        port_names => [],
        port_map => {},
        connected => 0
    };
    bless $self, $class;
    return $self;
}

sub add_port {
    my ($self, $name, $port, $baudrate, $data_bits, $stop_bits, $parity, $timeout) = @_;
    
    if (scalar @{$self->{readers}} >= 16) {
        print "已达到最大串口数量限制 (16)\n";
        return 0;
    }
    
    if (exists $self->{port_map}{$name}) {
        print "串口名称已存在: $name\n";
        return 0;
    }
    
    my $reader = SensorReader->new($port, $baudrate, $data_bits, $stop_bits, $parity, $timeout);
    push @{$self->{readers}}, $reader;
    push @{$self->{port_names}}, $name;
    $self->{port_map}{$name} = $reader;
    
    print "已添加串口: $name ($port)\n";
    return 1;
}

sub add_port_config {
    my ($self, $port_config) = @_;
    
    my $name = $port_config->{name} || '未知串口';
    my $port = $port_config->{port} || '';
    my $baudrate = $port_config->{baudrate} || 9600;
    my $data_bits = $port_config->{data_bits} || 8;
    my $stop_bits = $port_config->{stop_bits} || 1;
    my $parity = $port_config->{parity} || 'N';
    my $timeout = $port_config->{timeout} || 1.0;
    
    return $self->add_port($name, $port, $baudrate, $data_bits, $stop_bits, $parity, $timeout);
}

sub connect_all {
    my ($self) = @_;
    
    if (scalar @{$self->{readers}} == 0) {
        print "没有可连接的串口\n";
        return 0;
    }
    
    my $connected = 0;
    for my $i (0..$#{$self->{readers}}) {
        if ($self->{readers}[$i]->open) {
            $connected++;
            print "已连接串口: $self->{port_names}[$i]\n";
        } else {
            print "无法连接串口: $self->{port_names}[$i]\n";
        }
    }
    
    $self->{connected} = ($connected > 0) ? 1 : 0;
    return $self->{connected};
}

sub disconnect_all {
    my ($self) = @_;
    
    for my $reader (@{$self->{readers}}) {
        $reader->close if $reader->is_open;
    }
    
    $self->{connected} = 0;
    print "已断开所有串口连接\n";
}

sub is_connected {
    my ($self) = @_;
    return $self->{connected};
}

sub is_port_connected {
    my ($self, $port_name) = @_;
    
    my $reader = $self->{port_map}{$port_name};
    return 0 unless defined $reader;
    return $reader->is_open ? 1 : 0;
}

sub read_all_sensors {
    my ($self, $sensors) = @_;
    
    my @results;
    
    foreach my $sensor (@$sensors) {
        my $port_name = $sensor->{port_name};
        my $reader = $self->{port_map}{$port_name};
        
        unless (defined $reader) {
            my %error_result = (
                name => $sensor->{name},
                slave_id => $sensor->{slave_id},
                temperature => 0,
                humidity => 0,
                success => 0,
                error => "未找到串口: $port_name"
            );
            push @results, \%error_result;
            next;
        }
        
        unless ($reader->is_open) {
            my %error_result = (
                name => $sensor->{name},
                slave_id => $sensor->{slave_id},
                temperature => 0,
                humidity => 0,
                success => 0,
                error => "串口未打开: $port_name"
            );
            push @results, \%error_result;
            next;
        }
        
        my $result = $reader->read_sensor_data(
            $sensor->{slave_id},
            $sensor->{temp_reg},
            $sensor->{humi_reg},
            $sensor->{temp_scale},
            $sensor->{humi_scale},
            $sensor->{name}
        );
        
        push @results, $result;
    }
    
    return \@results;
}

sub get_port_count {
    my ($self) = @_;
    return scalar @{$self->{readers}};
}

sub get_port_name {
    my ($self, $index) = @_;
    return undef if $index < 0 || $index >= scalar @{$self->{port_names}};
    return $self->{port_names}[$index];
}

sub close {
    my ($self) = @_;
    $self->disconnect_all;
}

sub DESTROY {
    my ($self) = @_;
    $self->close if $self->{connected};
}

1;
