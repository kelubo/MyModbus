# Modbus温湿度传感器读取程序（Java）

## 简介

本程序使用Java语言实现，通过RS485接口读取Modbus温湿度传感器的数据，支持Windows和Linux平台。程序采用Maven进行项目管理，具有良好的跨平台特性和可扩展性。

## 功能特性

本程序具备以下核心功能：首先，支持多个Modbus传感器同时配置和读取，用户可以根据实际需求灵活配置传感器数量和参数；其次，程序能够自动检测操作系统类型并选择合适的串口设备，Windows平台使用COM端口命名方式，Linux平台使用/dev/tty设备命名方式；第三，程序提供四种数据存储方式供用户选择，包括SQLite本地数据库、CSV文件格式、InfluxDB时序数据库以及不保存数据的纯显示模式；第四，程序使用JSON格式的配置文件，所有参数都可以通过编辑配置文件进行调整，无需重新编译代码；最后，程序支持实时数据读取和显示，并在控制台输出传感器名称、从站地址、温度值和湿度值。

## 环境要求

### Java环境

程序需要Java Development Kit 8或更高版本支持。建议使用OpenJDK 11或Oracle JDK 11，因为这些版本经过充分测试且具有良好的稳定性。可以通过以下命令检查Java版本：

```bash
java -version
```

如果系统中未安装Java或版本不符合要求，需要从Adoptium、Oracle官网或使用包管理器进行安装。对于Ubuntu/Debian系统，可以使用apt包管理器安装OpenJDK：

```bash
sudo apt-get update
sudo apt-get install openjdk-11-jdk
```

对于Windows系统，可以从Adoptium官网下载MSI安装包进行安装。安装完成后，需要正确配置JAVA_HOME环境变量，并将Java的bin目录添加到PATH环境变量中。

### Maven环境

程序使用Maven 3.6或更高版本进行构建管理。Maven是Java生态系统中标准的项目管理工具，能够自动处理项目依赖、编译、测试和打包等流程。可以通过以下命令检查Maven版本：

```bash
mvn -version
```

如果系统中未安装Maven，可以从Apache Maven官网下载二进制压缩包，解压后配置MAVEN_HOME环境变量和PATH环境变量即可使用。对于Ubuntu/Debian系统，也可以使用apt包管理器安装：

```bash
sudo apt-get install maven
```

对于Windows系统，可以下载ZIP压缩包，解压后配置环境变量。建议使用Maven 3.8.x或更高版本，以获得更好的性能和安全性。

## 依赖配置

程序的所有依赖都在pom.xml文件中配置，使用Maven进行统一管理。主要依赖包括jSerialComm串口通信库、SQLite-JDBC数据库驱动、Gson JSON解析库、InfluxDB客户端库以及OpenCSV CSV文件处理库。这些依赖会自动从Maven中央仓库下载，无需手动安装。

核心依赖的版本信息如下：jSerialComm用于串口通信，版本为2.9.3，支持Windows和Linux平台的串口操作；SQLite-JDBC版本为3.42.0.0，提供Java程序与SQLite数据库的连接能力；Gson版本为2.10.1，用于JSON格式配置文件的解析和生成；InfluxDB客户端版本为6.12.0，用于与InfluxDB时序数据库进行交互；OpenCSV版本为5.9，用于CSV文件的读写操作。

所有依赖在运行Maven构建命令时会自动下载。如果网络访问Maven中央仓库速度较慢，可以配置阿里云Maven镜像仓库来加速下载。在pom.xml文件中或Maven的settings.xml文件中配置镜像仓库地址即可。

## 编译构建

### 编译命令

使用Maven编译项目的步骤非常简单。首先进入Java项目目录，然后执行Maven的编译命令。编译过程会检查代码语法、类型检查，并生成可执行的JAR文件：

```bash
cd Java
mvn clean package
```

上述命令中，clean参数会清理之前编译生成的文件，package参数会执行编译、测试和打包操作。编译成功后，会在target目录下生成可执行的JAR文件。生成的JAR文件命名格式为modbus-sensor-reader-版本号.jar。

### 运行程序

编译完成后，可以使用java命令运行程序。程序运行时会自动读取当前目录下的config.json配置文件，如果文件不存在则使用默认配置：

```bash
java -jar target/modbus-sensor-reader-1.0.0.jar
```

如果需要指定其他配置文件，可以使用-c或--config参数指定配置文件的路径和名称：

```bash
java -jar target/modbus-sensor-reader-1.0.0.jar -c /path/to/config.json
```

程序运行后会显示配置信息，然后开始按照配置的读取间隔循环读取传感器数据。每次读取的数据会保存到配置的存储系统中，并在控制台输出。

### 跳过测试编译

在编译过程中，Maven会自动运行单元测试。如果希望跳过测试阶段以加快编译速度，可以添加-DskipTests参数：

```bash
mvn clean package -DskipTests
```

需要注意的是，跳过测试编译可能会导致无法发现代码中的问题，建议在开发阶段不要跳过测试。

## 配置文件

### 配置文件格式

程序使用JSON格式的配置文件，文件名为config.json。配置文件采用UTF-8编码，包含串口参数、存储参数和传感器列表三部分内容。以下是一个完整的配置文件示例：

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

串口参数用于配置与Modbus传感器的通信方式。port参数指定串口设备名称，Windows平台默认为COM1，Linux平台默认为/dev/ttyUSB0；baudrate参数设置波特率，常用值为9600、19200、38400、57600和115200；data_bits参数设置数据位，支持5、6、7、8位，通常使用8位；stop_bits参数设置停止位，支持1或2位，通常使用1位；parity参数设置校验位，可选值包括N（无校验）、O（奇校验）和E（偶校验）；timeout参数设置串口读取超时时间，单位为秒。

### 存储参数配置

存储参数用于配置数据持久化方式。storage_type参数指定存储类型，可选值包括sqlite、csv、influxdb和none；storage_sqlite_path参数指定SQLite数据库文件路径，默认为sensor_data.db；storage_csv_path参数指定CSV文件路径，默认为sensor_data.csv；storage_influxdb_url参数指定InfluxDB服务器地址，默认为http://localhost:8086；storage_influxdb_token参数指定InfluxDB认证令牌；storage_influxdb_org参数指定InfluxDB组织名称；storage_influxdb_bucket参数指定InfluxDB存储桶名称。

### 传感器参数配置

sensors数组用于配置要读取的传感器列表。每个传感器对象包含以下参数：name为传感器名称，用于在输出中标识传感器；slave_id为Modbus从站地址，范围通常为1到247；temp_reg为温度寄存器地址，十六进制格式；humi_reg为湿度寄存器地址，十六进制格式；temp_scale为温度数据缩放系数，用于将原始数据转换为实际温度值；humi_scale为湿度数据缩放系数，用于将原始数据转换为实际湿度值。

### 默认配置

如果配置文件不存在或格式错误，程序会自动使用默认配置。默认配置包括：Windows平台串口为COM1，Linux平台串口为/dev/ttyUSB0；波特率为9600，数据位为8，停止位为1，无校验；读取间隔为2秒；存储类型为SQLite；默认包含一个传感器配置。

## 项目结构

Java项目采用标准的Maven目录结构，具有清晰的代码组织方式。以下是项目的目录结构和文件说明：

```
Java/
├── pom.xml                                  # Maven项目配置
├── config.json                              # 配置文件示例
└── src/main/java/com/modbus/
    ├── Main.java                            # 程序入口类
    ├── config/
    │   ├── AppConfig.java                   # 应用配置类
    │   ├── SensorConfig.java                # 传感器配置类
    │   ├── StorageConfig.java               # 存储配置类
    │   └── ConfigLoader.java                # 配置加载器
    ├── data/
    │   ├── SensorData.java                  # 传感器数据模型
    │   └── DataStorage.java                 # 数据存储接口
    ├── sensor/
    │   └── SensorReader.java                # 传感器读取实现
    └── storage/
        └── SensorDataStorage.java           # 存储实现类
```

Main.java是程序的入口点，负责初始化配置、创建传感器读取器和数据存储实例，并在主循环中读取传感器数据。config包包含所有与配置相关的类，AppConfig.java定义主配置类，SensorConfig.java定义单个传感器的配置，ConfigLoader.java负责从JSON文件加载配置。

data包包含数据模型类，SensorData.java定义传感器数据结构，DataStorage.java定义数据存储接口。sensor包包含传感器读取实现，SensorReader.java封装Modbus协议通信逻辑。storage包包含数据存储实现，SensorDataStorage.java提供SQLite、CSV和InfluxDB三种存储方式的实现。

## 存储类型说明

### SQLite数据库存储

SQLite是一种轻量级的嵌入式关系数据库，数据存储在本地文件中，无需单独的数据库服务器。SQLite存储方式适合中小规模的数据采集场景，具有以下特点：数据文件易于备份和迁移；支持标准SQL查询，便于数据分析；无需额外安装数据库软件；性能稳定可靠，适合长期运行。

程序会自动创建sensor_data.db数据库文件，并在其中创建sensor_data表存储传感器数据。表结构包括id（主键）、name（传感器名称）、slave_id（从站地址）、temperature（温度值）、humidity（湿度值）和timestamp（时间戳）。程序还会创建时间戳索引，加速按时间查询数据的性能。

### CSV文件存储

CSV是一种通用的文本格式，可以被Excel、 LibreOffice Calc等电子表格软件直接打开。CSV存储方式适合以下场景：数据量较小；需要与其他工具共享数据；希望以纯文本形式保存数据；不需要复杂的数据库查询功能。

程序会在配置的路径创建CSV文件，第一行为表头，包含name、slave_id、temperature、humidity、timestamp五个字段。每行记录一个传感器数据点。CSV文件采用追加模式写入，每次保存数据后刷新文件缓冲区。

### InfluxDB存储

InfluxDB是一种专门为时序数据设计的开源数据库，适合大规模数据采集和实时监控场景。InfluxDB存储方式具有以下优势：针对时序数据优化，查询性能优异；支持数据保留策略，自动清理过期数据；提供丰富的时序分析函数；支持集群部署，可扩展性强。

使用InfluxDB存储需要提前安装和配置InfluxDB服务器，并在配置文件中填写正确的服务器地址、认证令牌、组织名称和存储桶名称。当前版本的程序仅支持向InfluxDB写入数据，更多高级功能如批量写入、数据聚合等将在后续版本中实现。

### 不存储模式

选择none存储类型时，程序不会将数据保存到任何存储介质，仅在控制台实时显示。这种模式适合调试阶段或仅需实时监控不需要历史数据的场景，能够减少磁盘I/O，提高程序运行效率。

## 常见问题

### 串口无法打开

当程序报告无法打开串口时，可能的原因和解决方法如下：首先检查串口名称是否正确，Windows平台可以在设备管理器中查看串口号，Linux平台可以使用ls /dev/tty*命令查看可用串口；其次确认串口未被其他程序占用，有些程序会锁定串口设备，导致同时只有一个程序可以访问；第三检查用户权限，Linux系统下访问串口通常需要加入dialout用户组或使用sudo权限运行；最后检查串口硬件连接，确保RS485转换器正确连接且设备正常工作。

### 数据读取失败

如果程序能够打开串口但读取数据失败，可能是以下原因：传感器Modbus地址配置错误，检查配置文件中slave_id是否与传感器实际地址一致；通信参数不匹配，确认波特率、数据位、停止位和校验位与传感器设置一致；寄存器地址错误，检查temp_reg和humi_reg配置是否正确；传感器未正确响应，可以尝试使用Modbus调试工具验证传感器是否正常工作。

### 编译错误

编译过程中可能遇到的错误及解决方法：如果提示找不到依赖包，检查网络连接是否正常，Maven能否访问中央仓库；如果提示类或方法不存在，检查Java版本是否符合要求；如果提示编码问题，确保源文件和控制台使用UTF-8编码。

### 依赖下载缓慢

如果Maven下载依赖速度过慢，可以配置阿里云Maven镜像。在Maven的settings.xml文件中添加mirror配置，将仓库地址指向阿里云镜像。配置完成后重新运行编译命令即可。

## 技术原理

### Modbus RTU协议

Modbus是一种应用层协议，广泛用于工业自动化领域。Modbus RTU是Modbus协议的一种实现方式，使用二进制编码，通过串口进行传输。协议采用主从模式，由主设备发送请求，从设备响应请求。本程序作为主设备，主动读取从设备（传感器）的数据。

Modbus RTU协议的数据帧格式包括：从站地址（1字节）、功能码（1字节）、数据区（N字节）和CRC校验（2字节）。读取保持寄存器的功能码为0x03，请求中指定起始寄存器地址和寄存器数量，响应中返回对应数量的寄存器值。

### CRC校验

Modbus RTU协议使用CRC-16循环冗余校验来检测数据传输错误。发送方计算整个数据帧的CRC值并附加到帧末尾，接收方重新计算CRC并与收到的CRC比较，如果不匹配则说明数据传输有误。程序中实现了标准的Modbus CRC-16算法，确保数据传输的可靠性。

### 串口通信

程序使用jSerialComm库进行串口通信。jSerialComm是一个跨平台的Java串口库，支持Windows、Linux、macOS等操作系统。程序配置串口的波特率、数据位、停止位、校验位和超时参数，并通过串口发送Modbus请求和读取响应数据。

## 许可证

本程序采用MIT许可证开源，允许自由使用、修改和分发。
