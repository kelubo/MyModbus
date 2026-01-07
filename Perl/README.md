# Modbus温湿度传感器读取程序（Perl）

## 简介

本程序使用Perl语言实现，通过RS485接口读取Modbus温湿度传感器的数据，支持Windows和Linux平台。Perl作为一种高级脚本语言，具有简洁的语法和强大的文本处理能力，非常适合快速开发串口通信和数据处理应用。

本程序采用模块化设计，将配置管理、传感器读取和数据存储分离为独立的模块，便于维护和扩展。程序支持从配置文件加载设置，支持多种数据存储方式，并且具有良好的跨平台兼容性。Perl版本的程序无需编译即可直接运行，部署简单方便，适合在资源受限的环境中使用。

## 功能特性

本程序具备以下核心功能：首先，支持多个Modbus传感器同时配置和读取，用户可以在配置文件中定义任意数量的传感器，程序会按顺序依次读取每个传感器的数据；其次，程序能够自动检测操作系统类型并选择合适的串口设备，Windows平台使用Win32::SerialPort模块访问串口，Linux平台使用Device::SerialPort模块访问串口；第三，程序提供四种数据存储方式供用户选择，包括SQLite本地数据库、CSV文件格式、InfluxDB时序数据库以及不保存数据的纯显示模式；第四，程序使用JSON格式的配置文件，所有参数都可以通过编辑配置文件进行调整，无需修改源代码；最后，程序支持命令行参数指定配置文件路径，并提供帮助信息显示功能。

程序采用事件驱动的方式运行，主循环按照配置的读取间隔不断读取所有传感器的数据，并在控制台实时显示。每次读取的数据会立即保存到配置的存储系统中，同时在控制台输出传感器名称、从站地址、温度值和湿度值。程序还处理了Ctrl+C中断信号，确保用户可以正常退出程序。

## 环境要求

### Perl版本

程序需要Perl 5.16或更高版本支持。建议使用Perl 5.32或Perl 5.36，因为这些版本经过充分测试且具有良好的稳定性。可以通过以下命令检查Perl版本：

```bash
perl -v
```

如果系统中未安装Perl或版本不符合要求，需要安装适当版本的Perl。对于Windows系统，可以从Strawberry Perl官网下载安装包进行安装，Strawberry Perl是一个完整的Perl环境，包含编译器、运行库和常用模块。对于Linux系统，大多数发行版都预装了Perl，可以通过系统包管理器更新到最新版本。

Ubuntu/Debian系统可以使用以下命令安装或更新Perl：

```bash
sudo apt-get update
sudo apt-get install perl
```

CentOS/RHEL系统可以使用以下命令：

```bash
sudo yum install perl
```

macOS系统通常预装了Perl，也可以通过Homebrew安装最新版本：

```bash
brew install perl
```

### 模块依赖

程序依赖以下Perl模块，这些模块需要通过CPAN或系统包管理器安装：

Device::SerialPort或Win32::SerialPort模块用于串口通信。Device::SerialPort用于Linux/Unix系统，提供与串口设备交互的功能；Win32::SerialPort用于Windows系统，是Device::SerialPort在Windows平台的替代实现。这两个模块的接口兼容，程序会自动根据操作系统选择合适的模块。

JSON模块用于解析和生成JSON格式的配置文件。JSON模块是Perl标准发行版的一部分，大多数Perl环境已经预装。如果没有预装，可以使用cpan命令安装：

```bash
cpan JSON
```

DBI模块和SQLite数据库驱动用于SQLite数据存储。DBI是Perl数据库接口规范，提供统一的数据库访问方式；DBD::SQLite是SQLite的数据库驱动。这两个模块可以通过CPAN安装：

```bash
cpan DBI DBD::SQLite
```

Time::Piece模块用于时间处理，生成带时间戳的数据记录。Time::Piece是Perl标准发行版的一部分，通常已经预装。

### Windows平台安装

在Windows平台，推荐使用Strawberry Perl或ActivePerl。安装完成后，需要通过CPAN安装额外的模块。打开命令提示符或PowerShell，执行以下命令：

```bash
cpan Win32::SerialPort
cpan DBI
cpan DBD::SQLite
cpan JSON
```

安装过程中，CPAN会自动下载模块的依赖包。如果遇到编译错误，可能需要安装Visual Studio Build Tools以提供编译环境。

### Linux平台安装

在Linux平台，可以使用系统包管理器安装Perl模块。Ubuntu/Debian系统执行：

```bash
sudo apt-get install libdevice-serialport-perl libjson-perl libdbi-perl libdbd-sqlite3-perl
```

CentOS/RHEL系统执行：

```bash
sudo yum install perl-Device-SerialPort perl-JSON perl-DBI perl-DBD-SQLite
```

如果系统包管理器中的模块版本较旧，也可以通过CPAN安装最新版本。

### CPAN安装方法

如果系统包管理器中的模块不可用或版本过旧，可以使用CPAN手动安装。CPAN是Comprehensive Perl Archive Network的缩写，是Perl模块的官方仓库。安装模块的方法如下：

```bash
cpan Module::Name
```

例如安装JSON模块：

```bash
cpan JSON
```

首次使用CPAN时，会提示配置CPAN镜像源和安装选项。建议选择自动配置，CPAN会自动选择最快的镜像源。安装过程中可能需要确认编译选项和依赖关系。

## 模块安装脚本

为了简化依赖安装，提供了install_dependencies.pl脚本。该脚本会自动检测操作系统类型，安装所需的Perl模块：

```bash
perl install_dependencies.pl
```

脚本会输出安装进度和结果。如果某个模块安装失败，脚本会显示错误信息，请根据错误信息解决相应问题后重试。

## 配置说明

### 配置文件格式

程序使用JSON格式的配置文件，文件名为config.json。配置文件采用UTF-8编码，包含串口参数、存储参数和传感器列表三部分内容。以下是一个完整的配置文件示例，配置了两个传感器：

```json
{
    "port": "/dev/ttyUSB0",
    "baudrate": 9600,
    "data_bits": 8,
    "stop_bits": 1,
    "parity": "N",
    "timeout": 1.0,
    "read_interval": 2,
    "storage_type": "sqlite",
    "storage_sqlite_path": "sensor_data.db",
    "storage_influxdb_url": "http://localhost:8086",
    "storage_influxdb_token": "your-token-here",
    "storage_influxdb_org": "your-org",
    "storage_influxdb_bucket": "sensor-data",
    "storage_csv_path": "sensor_data.csv",
    "sensors": [
        {
            "name": "传感器1",
            "slave_id": 1,
            "temp_reg": 0,
            "humi_reg": 1,
            "temp_scale": 0.1,
            "humi_scale": 0.1
        },
        {
            "name": "传感器2",
            "slave_id": 2,
            "temp_reg": 0,
            "humi_reg": 1,
            "temp_scale": 0.1,
            "humi_scale": 0.1
        }
    ]
}
```

### 串口参数配置

串口参数用于配置与Modbus传感器的通信方式。port参数指定串口设备名称，Windows平台默认为COM1，Linux平台默认为/dev/ttyUSB0。需要根据实际的串口设备修改此参数，可以使用设备管理器或ls /dev/tty*命令查看可用的串口设备。

baudrate参数设置波特率，常用值为9600、19200、38400、57600和115200。波特率必须与传感器的设置一致，否则通信会失败。大多数Modbus传感器默认使用9600波特率。

data_bits参数设置数据位，支持5、6、7、8位。Modbus协议通常使用8位数据位。

stop_bits参数设置停止位，支持1或2位。Modbus协议通常使用1位停止位。

parity参数设置校验位，可选值包括N（无校验）、O（奇校验）和E（偶校验）。无校验是最常用的设置。

timeout参数设置串口读取超时时间，单位为秒。如果在指定时间内没有收到传感器的响应，程序会报告超时错误。

read_interval参数设置读取间隔，单位为秒。每次读取完所有传感器后，程序会等待指定时间再进行下一次读取。

### 存储参数配置

storage_type参数指定存储类型，可选值包括sqlite、csv、influxdb和none。不同的存储类型适合不同的应用场景，用户可以根据实际需求选择。

storage_sqlite_path参数指定SQLite数据库文件路径。当storage_type为sqlite时有效，程序会在指定路径创建SQLite数据库文件保存数据。

storage_csv_path参数指定CSV文件路径。当storage_type为csv时有效，程序会在指定路径创建或追加CSV文件。

storage_influxdb_url参数指定InfluxDB服务器地址。当storage_type为influxdb时有效，默认为http://localhost:8086。

storage_influxdb_token参数指定InfluxDB认证令牌。当storage_type为influxdb时有效，需要在InfluxDB服务器上生成认证令牌。

storage_influxdb_org参数指定InfluxDB组织名称。当storage_type为influxdb时有效。

storage_influxdb_bucket参数指定InfluxDB存储桶名称。当storage_type为influxdb时有效。

### 传感器参数配置

sensors数组用于配置要读取的传感器列表。每个传感器对象包含以下参数：

name为传感器名称，用于在输出中标识传感器。建议使用有意义的名称，如"室内传感器"、"室外传感器"等。

slave_id为Modbus从站地址，范围通常为1到247。每个传感器必须有唯一的从站地址，否则无法区分不同传感器的响应。

temp_reg为温度寄存器地址，十六进制格式。不同的传感器可能有不同的寄存器地址，需要查阅传感器的Modbus协议文档。

humi_reg为湿度寄存器地址，十六进制格式。格式与温度寄存器地址相同。

temp_scale为温度数据缩放系数，用于将原始数据转换为实际温度值。传感器返回的数据通常是整数，需要乘以缩放系数得到实际值。

humi_scale为湿度数据缩放系数，用于将原始数据转换为实际湿度值。格式与温度缩放系数相同。

### 默认配置

如果配置文件不存在或格式错误，程序会自动使用默认配置。默认配置包括：Windows平台串口为COM1，Linux平台串口为/dev/ttyUSB0；波特率为9600，数据位为8，停止位为1，无校验；读取间隔为2秒；存储类型为SQLite；默认包含一个传感器配置，从站地址为1，寄存器地址为0和1，缩放系数为0.1。

## 运行程序

### 基本用法

程序入口为modbus_sensor_reader.pl脚本。运行程序最简单的方式是进入Perl项目目录，直接执行脚本：

```bash
cd Perl
perl modbus_sensor_reader.pl
```

程序启动后会显示配置信息，然后开始按照配置的读取间隔循环读取传感器数据。每次读取的数据会显示在控制台，并保存到配置的存储系统中。

### 命令行参数

程序支持以下命令行参数：

-c或--config参数用于指定配置文件的路径。默认情况下，程序会查找当前目录下的config.json文件。使用此参数可以指定其他路径的配置文件：

```bash
perl modbus_sensor_reader.pl -c /path/to/config.json
perl modbus_sensor_reader.pl --config config_production.json
```

-h或--help参数用于显示帮助信息。帮助信息包括程序简介、用法说明和参数列表：

```bash
perl modbus_sensor_reader.pl -h
perl modbus_sensor_reader.pl --help
```

### 停止程序

程序运行时，可以按Ctrl+C组合键发送中断信号，程序会正常退出。在退出前，程序会关闭串口连接和数据存储，确保数据不会丢失。

### 输出示例

程序运行时的典型输出如下：

```
Modbus温湿度传感器读取程序 (Perl)
================================
配置文件 config.json 加载成功
配置信息:
  串口: /dev/ttyUSB0
  波特率: 9600
  数据位: 8
  停止位: 1
  校验位: N
  超时: 1秒
  读取间隔: 2秒
  存储类型: SQLite
  传感器数量: 2
  传感器1: 传感器1 (从站地址: 1, 温度寄存器: 0x0000, 湿度寄存器: 0x0001)
  传感器2: 传感器2 (从站地址: 2, 温度寄存器: 0x0000, 湿度寄存器: 0x0001)
串口 /dev/ttyUSB0 已打开
SQLite数据库已连接: sensor_data.db

开始读取传感器数据...
  [2024-01-15 10:30:45] 传感器1 [从站 1]: 温度 23.5°C, 湿度 55.2%
  [2024-01-15 10:30:46] 传感器2 [从站 2]: 温度 22.8°C, 湿度 58.1%
  [2024-01-15 10:30:48] 传感器1 [从站 1]: 温度 23.6°C, 湿度 55.0%
  ...
```

## 项目结构

Perl项目采用简洁的目录结构，程序文件和模块文件分离，便于维护和扩展。以下是项目的目录结构和文件说明：

```
Perl/
├── config.json                    # 配置文件
├── modbus_sensor_reader.pl        # 主程序入口
├── install_dependencies.pl        # 依赖安装脚本
├── README.md                      # 本文档
└── lib/
    ├── Config.pm                  # 配置模块
    ├── SensorReader.pm            # 传感器读取模块
    └── DataStorage.pm             # 数据存储模块
```

modbus_sensor_reader.pl是程序的入口点，负责解析命令行参数、加载配置、创建模块实例和运行主循环。脚本使用strict和warnings模式，确保代码质量。

lib/目录下是程序依赖的Perl模块。Config.pm模块负责配置文件的解析和访问，提供getter和setter方法访问配置参数。SensorReader.pm模块封装了Modbus协议通信逻辑，包括CRC校验、请求发送和响应接收。DataStorage.pm模块实现了数据存储的工厂模式，根据配置创建相应的存储对象。

Config.pm模块的主要功能包括：从JSON文件加载配置、设置和获取各种配置参数、获取传感器列表、打印配置信息。模块使用JSON模块解析配置文件，使用异常处理确保配置文件不存在或格式错误时能够优雅降级到默认配置。

SensorReader.pm模块的主要功能包括：打开和关闭串口、发送Modbus请求、接收响应、解析传感器数据。模块支持Windows和Linux平台的串口访问，自动选择合适的串口模块。模块实现了Modbus CRC-16校验算法，确保数据传输的可靠性。

DataStorage.pm模块采用面向对象的设计，实现了多种存储方式的统一接口。模块包含一个基类和四个具体存储类：DataStorage是抽象基类，定义保存和关闭接口；SQLiteStorage实现SQLite数据库存储；CSVStorage实现CSV文件存储；InfluxDBStorage实现InfluxDB存储（当前仅支持配置）；NoneStorage实现不存储模式。

## 存储类型说明

### SQLite数据库存储

SQLite是一种轻量级的嵌入式关系数据库，数据存储在本地文件中，无需单独的数据库服务器。SQLite存储方式适合中小规模的数据采集场景，具有以下特点：数据文件易于备份和迁移；支持标准SQL查询，便于数据分析；无需额外安装数据库软件；性能稳定可靠，适合长期运行。

程序会自动创建sensor_data.db数据库文件，并在其中创建sensor_data表存储传感器数据。表结构包括id（主键）、name（传感器名称）、slave_id（从站地址）、temperature（温度值）、湿度值（humidity）和timestamp（时间戳）。程序还会创建时间戳索引，加速按时间查询数据的性能。

使用SQLite存储时，可以直接使用SQLite命令行工具或图形化管理工具查看数据：

```bash
sqlite3 sensor_data.db
sqlite> SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 10;
```

### CSV文件存储

CSV是一种通用的文本格式，可以被Excel、LibreOffice Calc等电子表格软件直接打开。CSV存储方式适合以下场景：数据量较小；需要与其他工具共享数据；希望以纯文本形式保存数据；不需要复杂的数据库查询功能。

程序会在配置的路径创建CSV文件，第一行为表头，包含name、slave_id、temperature、humidity、timestamp五个字段。每行记录一个传感器数据点。CSV文件采用追加模式写入，每次保存数据后刷新文件缓冲区。

CSV文件的格式示例：

```csv
name,slave_id,temperature,humidity,timestamp
传感器1,1,23.5,55.2,2024-01-15 10:30:45
传感器2,2,22.8,58.1,2024-01-15 10:30:46
传感器1,1,23.6,55.0,2024-01-15 10:30:48
```

### InfluxDB存储

InfluxDB是一种专门为时序数据设计的开源数据库，适合大规模数据采集和实时监控场景。InfluxDB存储方式具有以下优势：针对时序数据优化，查询性能优异；支持数据保留策略，自动清理过期数据；提供丰富的时序分析函数；支持集群部署，可扩展性强。

使用InfluxDB存储需要提前安装和配置InfluxDB服务器，并在配置文件中填写正确的服务器地址、认证令牌、组织名称和存储桶名称。当前版本的程序仅支持向InfluxDB写入数据，没有实现完整的HTTP请求功能。

InfluxDB适合以下应用场景：需要长期存储大量数据；需要对数据进行时序分析；需要与其他监控系统集成；需要使用Grafana等工具可视化数据。

### 不存储模式

选择none存储类型时，程序不会将数据保存到任何存储介质，仅在控制台实时显示。这种模式适合以下场景：调试阶段，需要检查数据读取是否正常；仅需实时监控，不需要历史数据；资源受限，无法使用数据库或文件系统。

## 常见问题

### 串口无法打开

当程序报告无法打开串口时，可能的原因和解决方法如下：

首先，检查串口名称是否正确。Windows平台可以在设备管理器中查看串口号，如COM1、COM2等；Linux平台可以使用ls /dev/tty*命令查看可用串口，使用ls -l /dev/ttyUSB*查看USB转串口设备。确认配置文件中的port参数与实际串口名称一致。

其次，确认串口未被其他程序占用。有些程序会锁定串口设备，导致同时只有一个程序可以访问。可以尝试关闭其他可能使用串口的程序，然后重新运行程序。

第三，检查用户权限。Linux系统下访问串口通常需要相应权限。可以将用户加入dialout用户组来解决：

```bash
sudo usermod -a -G dialout $USER
```

修改用户组后需要重新登录才能生效。也可以使用sudo权限运行程序：

```bash
sudo perl modbus_sensor_reader.pl
```

第四，检查串口硬件连接。确保RS485转换器正确连接且设备正常工作。可以使用其他串口工具测试串口是否可用。

### 数据读取失败

如果程序能够打开串口但读取数据失败，可能是以下原因：

传感器Modbus地址配置错误。检查配置文件中slave_id是否与传感器实际地址一致。如果不确定传感器的地址，可以尝试使用Modbus扫描工具或从传感器手册中查找。

通信参数不匹配。确认波特率、数据位、停止位和校验位与传感器设置一致。大多数Modbus传感器默认使用9600波特率、8位数据位、1位停止位、无校验。

寄存器地址错误。检查temp_reg和humi_reg配置是否正确。不同的传感器可能有不同的寄存器地址，需要查阅传感器的Modbus协议文档。寄存器地址通常以十六进制表示，如0x0000。

传感器未正确响应。可以尝试使用Modbus调试工具（如modpoll）验证传感器是否正常工作：

```bash
modpoll -m rtu -a 1 -b 9600 -p none -s 1 -t 4 -r 0 -c 2 /dev/ttyUSB0
```

### 模块安装失败

如果安装Perl模块时遇到问题，可以尝试以下解决方法：

网络问题。确保能够访问CPAN镜像站。可以尝试更换CPAN镜像源：

```bash
cpan
cpan> o conf urllist http://mirrors.163.com/cpan/
cpan> o conf commit
```

编译问题。某些模块需要C编译器才能安装。Linux系统通常已安装gcc；Windows系统需要安装Strawberry Perl或Visual Studio Build Tools。

权限问题。在Linux系统下，可能需要使用sudo权限安装模块：

```bash
sudo cpan Module::Name
```

依赖问题。某些模块依赖于其他模块或库文件。可以使用cpan命令的自动依赖安装功能，或手动安装依赖后再安装目标模块。

### 配置文件格式错误

如果程序报告配置文件格式错误，请检查以下几点：

JSON语法是否正确。JSON格式要求严格的语法规则：键名必须使用双引号；字符串值必须使用双引号；数组和对象必须使用方括号和花括号；元素之间使用逗号分隔；不支持注释。

文件编码是否为UTF-8。JSON文件必须使用UTF-8编码保存。可以使用文本编辑器或命令行工具检查和转换文件编码：

```bash
file config.json
iconv -f UTF-8 -t UTF-8 config.json > config_new.json
```

配置项名称是否正确。配置项名称必须与程序预期的一致，包括大小写。建议直接复制示例配置文件作为模板，然后修改相应参数。

### 程序运行缓慢

如果程序运行缓慢，可能的原因包括：

读取间隔设置过短。增加read_interval参数的值，减少数据读取频率。

存储操作耗时过长。SQLite在大量数据插入时可能较慢，可以考虑使用CSV存储或优化SQLite配置。

系统资源不足。检查内存和CPU使用情况，关闭不必要的程序。

## 技术原理

### Modbus RTU协议

Modbus是一种应用层协议，广泛用于工业自动化领域。Modbus RTU是Modbus协议的一种实现方式，使用二进制编码，通过串口进行传输。协议采用主从模式，由主设备发送请求，从设备响应请求。本程序作为主设备，主动读取从设备（传感器）的数据。

Modbus RTU协议的数据帧格式包括：从站地址（1字节）、功能码（1字节）、数据区（N字节）和CRC校验（2字节）。读取保持寄存器的功能码为0x03，请求中指定起始寄存器地址和寄存器数量，响应中返回对应数量的寄存器值。

请求帧格式：第一个字节是从站地址，指定要通信的传感器；第二个字节是功能码，0x03表示读取保持寄存器；第三和第四字节是起始寄存器地址，高位在前；第五和第六字节是寄存器数量，高位在前；最后两个字节是CRC校验码。

响应帧格式：第一个字节是从站地址，与请求一致；第二个字节是功能码，与请求一致；第三个字节是数据字节数；接下来的字节是寄存器数据，每两个字节表示一个寄存器值；最后两个字节是CRC校验码。

### CRC校验算法

Modbus RTU协议使用CRC-16循环冗余校验来检测数据传输错误。CRC-16校验算法的计算过程如下：初始化CRC值为0xFFFF；对数据帧的每个字节进行异或操作；进行8次移位和异或操作，根据最低位是否为1决定是否与多项式异或；重复直到处理完所有字节；最终得到的CRC值需要交换高低字节。

发送方计算整个数据帧的CRC值并附加到帧末尾，接收方重新计算CRC并与收到的CRC比较，如果不匹配则说明数据传输有误。程序中实现了标准的Modbus CRC-16算法，确保数据传输的可靠性。

### 串口通信原理

串口是计算机与外部设备通信的常用接口。串口通信涉及以下关键参数：

波特率表示每秒传输的比特数，常用值包括9600、19200、38400、57600和115200。通信双方必须使用相同的波特率才能正确解析数据。

数据位表示每个字符的编码位数，通常为8位。

停止位表示字符传输结束后的高电平时间，通常为1位。

校验位用于错误检测，常用选项包括无校验、奇校验和偶校验。

Perl程序使用Device::SerialPort或Win32::SerialPort模块进行串口操作。模块提供了设置串口参数、发送数据、接收数据等接口。程序通过这些接口发送Modbus请求并接收响应数据。

## 性能优化

### 调整读取间隔

根据实际需求调整read_interval参数。对于不需要高频率采样的场景，可以将读取间隔设置为5秒或更长，以减少系统负载和数据存储量。对于需要高频率采样的场景，可以将读取间隔设置为1秒或更短，但需要注意数据存储的性能。

### 选择合适的存储类型

根据数据量选择合适的存储类型。小数据量（每天几千条记录）可以选择SQLite或CSV；大数据量（每天数万条记录）建议使用InfluxDB；仅实时监控可以选择不存储模式。

### 数据库维护

如果使用SQLite存储，长期运行后数据库文件会不断增大。可以定期执行VACUUM命令优化数据库：

```bash
sqlite3 sensor_data.db "VACUUM;"
```

也可以设置数据保留策略，定期清理过期数据。

## 扩展开发

### 添加新的存储类型

要添加新的存储类型，需要在DataStorage.pm中创建新的存储类。新类需要继承DataStorage包，实现save和close方法：

```perl
package MyStorage;
use parent -norequire, 'DataStorage';

sub new {
    my ($class, $config) = @_;
    my $self = $class->SUPER::new('mystorage', $config);
    # 初始化代码
    bless $self, $class;
    return $self;
}

sub save {
    my ($self, $record) = @_;
    # 保存数据代码
    return 1;
}

sub close {
    my ($self) = @_;
    # 清理代码
}
```

然后在DataStorage::create函数中添加对新存储类型的支持。

### 添加新的传感器类型

如果需要支持其他类型的Modbus传感器，可以在SensorReader.pm中添加新的读取方法，或修改现有的read_sensor_data方法以支持更多的配置选项。

### 集成Web界面

可以使用Perl的Web框架（如Dancer或Mojolicious）创建Web界面，实时显示传感器数据和历史趋势图。需要扩展DataStorage模块以支持数据查询功能。

## 许可证

本程序采用MIT许可证开源，允许自由使用、修改和分发。
