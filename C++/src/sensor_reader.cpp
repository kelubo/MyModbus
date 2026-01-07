#include "sensor_reader.h"
#include <iostream>
#include <thread>
#include <chrono>
#include <vector>
#include <tuple>

#ifdef _WIN32
    #include <windows.h>
#else
    #include <termios.h>
    #include <fcntl.h>
    #include <unistd.h>
    #include <sys/ioctl.h>
#endif

class SensorReader::Impl {
public:
    Impl(const std::string& port, int baudrate, int dataBits,
         int stopBits, char parity, int timeoutMs)
        : port_(port), baudrate_(baudrate), dataBits_(dataBits),
          stopBits_(stopBits), parity_(parity), timeoutMs_(timeoutMs),
          handle_(INVALID_HANDLE_VALUE), connected_(false) {}

    ~Impl() {
        disconnect();
    }

    bool connect() {
#ifdef _WIN32
        std::string adjustedPort = "\\\\.\\" + port_;
        handle_ = CreateFileA(adjustedPort.c_str(),
                              GENERIC_READ | GENERIC_WRITE,
                              0, NULL, OPEN_EXISTING,
                              FILE_ATTRIBUTE_NORMAL, NULL);

        if (handle_ == INVALID_HANDLE_VALUE) {
            std::cerr << "无法打开串口: " << port_ << std::endl;
            return false;
        }

        DCB dcbSerialParams = {0};
        dcbSerialParams.DCBlength = sizeof(dcbSerialParams);

        if (!GetCommState(handle_, &dcbSerialParams)) {
            std::cerr << "获取串口状态失败" << std::endl;
            CloseHandle(handle_);
            handle_ = INVALID_HANDLE_VALUE;
            return false;
        }

        dcbSerialParams.BaudRate = baudrate_;
        dcbSerialParams.ByteSize = static_cast<BYTE>(dataBits_);
        dcbSerialParams.StopBits = (stopBits_ == 1) ? ONESTOPBIT : TWOSTOPBITS;
        dcbSerialParams.Parity = (parity_ == 'N') ? NOPARITY :
                                 (parity_ == 'E') ? EVENPARITY : ODDPARITY;
        dcbSerialParams.fBinary = TRUE;
        dcbSerialParams.fOutxCtsFlow = FALSE;
        dcbSerialParams.fOutxDsrFlow = FALSE;
        dcbSerialParams.fDtrControl = DTR_CONTROL_ENABLE;
        dcbSerialParams.fRtsControl = RTS_CONTROL_ENABLE;
        dcbSerialParams.fOutX = FALSE;
        dcbSerialParams.fInX = FALSE;
        dcbSerialParams.fErrorChar = FALSE;
        dcbSerialParams.fNull = FALSE;
        dcbSerialParams.fAbortOnError = FALSE;

        if (!SetCommState(handle_, &dcbSerialParams)) {
            std::cerr << "设置串口参数失败" << std::endl;
            CloseHandle(handle_);
            handle_ = INVALID_HANDLE_VALUE;
            return false;
        }

        COMMTIMEOUTS timeouts = {0};
        timeouts.ReadIntervalTimeout = timeoutMs_;
        timeouts.ReadTotalTimeoutConstant = timeoutMs_;
        timeouts.ReadTotalTimeoutMultiplier = 0;
        timeouts.WriteTotalTimeoutConstant = timeoutMs_;
        timeouts.WriteTotalTimeoutMultiplier = 0;
        SetCommTimeouts(handle_, &timeouts);

        connected_ = true;
        return true;
#else
        handle_ = open(port_.c_str(), O_RDWR | O_NOCTTY);
        if (handle_ < 0) {
            std::cerr << "无法打开串口: " << port_ << std::endl;
            return false;
        }

        struct termios tty;
        memset(&tty, 0, sizeof(tty));

        if (tcgetattr(handle_, &tty) != 0) {
            std::cerr << "获取串口属性失败" << std::endl;
            close(handle_);
            handle_ = -1;
            return false;
        }

        cfmakeraw(&tty);

        speed_t speed;
        switch (baudrate_) {
            case 9600: speed = B9600; break;
            case 19200: speed = B19200; break;
            case 38400: speed = B38400; break;
            case 57600: speed = B57600; break;
            case 115200: speed = B115200; break;
            default: speed = B9600; break;
        }

        cfsetospeed(&tty, speed);
        cfsetispeed(&tty, speed);

        tty.c_cflag |= (CLOCAL | CREAD);
        tty.c_cflag &= ~(PARENB | PARODD);
        if (parity_ == 'E') tty.c_cflag |= PARENB;
        if (parity_ == 'O') tty.c_cflag |= PARODD;

        tty.c_cflag &= ~CSTOPB;
        tty.c_cflag &= ~CSIZE;
        tty.c_cflag |= CS8;

        tty.c_lflag = 0;
        tty.c_oflag = 0;
        tty.c_iflag = 0;

        tty.c_cc[VMIN] = 0;
        tty.c_cc[VTIME] = timeoutMs_ / 100;

        tcflush(handle_, TCIFLUSH);
        if (tcsetattr(handle_, TCSANOW, &tty) != 0) {
            std::cerr << "设置串口参数失败" << std::endl;
            close(handle_);
            handle_ = -1;
            return false;
        }

        connected_ = true;
        return true;
#endif
    }

    void disconnect() {
        if (connected_) {
#ifdef _WIN32
            CloseHandle(handle_);
            handle_ = INVALID_HANDLE_VALUE;
#else
            close(handle_);
            handle_ = -1;
#endif
            connected_ = false;
        }
    }

    bool isConnected() const {
        return connected_;
    }

    bool sendModbusRequest(uint8_t slaveId, uint8_t funcCode,
                           uint16_t regAddr, uint16_t regCount) {
        if (!connected_) return false;

        uint8_t request[8];
        request[0] = slaveId;
        request[1] = funcCode;
        request[2] = (regAddr >> 8) & 0xFF;
        request[3] = regAddr & 0xFF;
        request[4] = (regCount >> 8) & 0xFF;
        request[5] = regCount & 0xFF;

        uint16_t crc = calculateCRC(request, 6);
        request[6] = crc & 0xFF;
        request[7] = (crc >> 8) & 0xFF;

#ifdef _WIN32
        DWORD bytesWritten;
        WriteFile(handle_, request, 8, &bytesWritten, NULL);
        return bytesWritten == 8;
#else
        ssize_t result = write(handle_, request, 8);
        tcdrain(handle_);
        return result == 8;
#endif
    }

    bool readResponse(uint8_t* buffer, int expectedBytes, int timeoutMs) {
        if (!connected_) return false;

        int bytesRead = 0;
        auto startTime = std::chrono::steady_clock::now();

        while (bytesRead < expectedBytes) {
            auto elapsed = std::chrono::steady_clock::now() - startTime;
            if (std::chrono::duration_cast<std::chrono::milliseconds>(elapsed).count() > timeoutMs) {
                break;
            }

#ifdef _WIN32
            DWORD avail = 0;
            if (!PurgeComm(handle_, PURGE_RXCLEAR)) {
                return false;
            }
            COMSTAT stat;
            if (ClearCommError(handle_, NULL, &stat) && stat.cbInQue > 0) {
                DWORD toRead = std::min<DWORD>(expectedBytes - bytesRead, stat.cbInQue);
                DWORD bytes;
                if (ReadFile(handle_, buffer + bytesRead, toRead, &bytes, NULL)) {
                    bytesRead += bytes;
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
#else
            int avail = 0;
            ioctl(handle_, FIONREAD, &avail);
            if (avail > 0) {
                int toRead = std::min(expectedBytes - bytesRead, avail);
                ssize_t result = read(handle_, buffer + bytesRead, toRead);
                if (result > 0) {
                    bytesRead += result;
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
#endif
        }

        return bytesRead == expectedBytes;
    }

    SensorData readRawData(uint8_t slaveId, uint16_t tempReg,
                           uint16_t humiReg) {
        SensorData result;
        result.slave_id = slaveId;
        result.error = true;
        result.temperature = 0.0;
        result.humidity = 0.0;

        if (!connected_) {
            result.error_message = "未连接设备";
            return result;
        }

        uint8_t response[64];
        int expectedBytes = 5 + 4;

        if (!sendModbusRequest(slaveId, 0x03, tempReg, 2)) {
            result.error_message = "发送读取请求失败";
            return result;
        }

        if (!readResponse(response, expectedBytes, timeoutMs_ * 2)) {
            result.error_message = "读取响应超时";
            return result;
        }

        if (response[0] != slaveId) {
            result.error_message = "从站地址不匹配";
            return result;
        }

        if (response[1] != 0x03) {
            if (response[1] == 0x83) {
                result.error_message = "Modbus异常响应: " + std::to_string(response[2]);
            } else {
                result.error_message = "未知功能码响应";
            }
            return result;
        }

        if (response[2] != 4) {
            result.error_message = "数据长度不正确";
            return result;
        }

        uint16_t tempRaw = (static_cast<uint16_t>(response[3]) << 8) |
                          static_cast<uint16_t>(response[4]);
        uint16_t humiRaw = (static_cast<uint16_t>(response[5]) << 8) |
                          static_cast<uint16_t>(response[6]);

        result.temperature = static_cast<double>(tempRaw) / 10.0;
        result.humidity = static_cast<double>(humiRaw) / 10.0;
        result.error = false;
        result.error_message.clear();

        return result;
    }

private:
    uint16_t calculateCRC(const uint8_t* data, int length) {
        uint16_t crc = 0xFFFF;
        for (int i = 0; i < length; i++) {
            crc ^= static_cast<uint16_t>(data[i]);
            for (int j = 0; j < 8; j++) {
                if (crc & 0x0001) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc >>= 1;
                }
            }
        }
        return crc;
    }

    std::string port_;
    int baudrate_;
    int dataBits_;
    int stopBits_;
    char parity_;
    int timeoutMs_;
#ifdef _WIN32
    HANDLE handle_;
#else
    int handle_;
#endif
    bool connected_;
};

SensorReader::SensorReader(const std::string& port, int baudrate, int dataBits,
                           int stopBits, char parity, int timeoutMs)
    : impl_(std::make_unique<Impl>(port, baudrate, dataBits, stopBits, parity, timeoutMs)) {}

SensorReader::~SensorReader() {
    disconnect();
}

bool SensorReader::connect() {
    return impl_->connect();
}

void SensorReader::disconnect() {
    impl_->disconnect();
}

bool SensorReader::isConnected() const {
    return impl_->isConnected();
}

SensorData SensorReader::readSensor(uint8_t slaveId, uint16_t tempReg,
                                    uint16_t humiReg, double tempScale,
                                    double humiScale, const std::string& sensorName) {
    SensorData result = impl_->readRawData(slaveId, tempReg, humiReg);
    result.name = sensorName;
    result.slave_id = slaveId;
    result.temperature *= tempScale;
    result.humidity *= humiScale;
    return result;
}

std::vector<SensorData> SensorReader::readAllSensors(
    const std::vector<std::tuple<uint8_t, uint16_t, uint16_t, double, double, std::string>>& sensors) {
    std::vector<SensorData> results;
    results.reserve(sensors.size());

    for (const auto& sensor : sensors) {
        SensorData data = readSensor(
            std::get<0>(sensor),
            std::get<1>(sensor),
            std::get<2>(sensor),
            std::get<3>(sensor),
            std::get<4>(sensor),
            std::get<5>(sensor)
        );
        results.push_back(data);
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    return results;
}

std::string SensorReader::getDefaultPort() {
#ifdef _WIN32
    return "COM1";
#else
    return "/dev/ttyUSB0";
#endif
}

MultiPortReader::MultiPortReader() = default;

MultiPortReader::~MultiPortReader() {
    disconnectAll();
}

bool MultiPortReader::addPort(const std::string& name, const std::string& port, int baudrate,
                               int dataBits, int stopBits, char parity, int timeoutMs) {
    if (readers_.size() >= 16) {
        return false;
    }
    readers_.push_back(std::make_unique<SensorReader>(port, baudrate, dataBits, stopBits, parity, timeoutMs));
    portNames_.push_back(name);
    return true;
}

bool MultiPortReader::connectAll() {
    int connected = 0;
    for (size_t i = 0; i < readers_.size(); ++i) {
        if (readers_[i]->connect()) {
            connected++;
            std::cout << "已连接串口: " << portNames_[i] << std::endl;
        } else {
            std::cerr << "无法连接串口: " << portNames_[i] << std::endl;
        }
    }
    return connected > 0;
}

void MultiPortReader::disconnectAll() {
    for (auto& reader : readers_) {
        reader->disconnect();
    }
}

std::vector<SensorData> MultiPortReader::readAllSensors(
    const std::vector<std::tuple<uint8_t, uint16_t, uint16_t, double, double, std::string, std::string>>& sensors) {
    std::vector<SensorData> results;
    results.reserve(sensors.size());

    for (const auto& sensor : sensors) {
        uint8_t slaveId = std::get<0>(sensor);
        uint16_t tempReg = std::get<1>(sensor);
        uint16_t humiReg = std::get<2>(sensor);
        double tempScale = std::get<3>(sensor);
        double humiScale = std::get<4>(sensor);
        std::string sensorName = std::get<5>(sensor);
        std::string portName = std::get<6>(sensor);

        SensorData data;
        data.name = sensorName;
        data.slave_id = slaveId;
        data.error = true;
        data.temperature = 0.0;
        data.humidity = 0.0;

        bool found = false;
        for (size_t i = 0; i < portNames_.size(); ++i) {
            if (portNames_[i] == portName) {
                if (readers_[i]->isConnected()) {
                    data = readers_[i]->readSensor(slaveId, tempReg, humiReg, tempScale, humiScale, sensorName);
                    data.temperature *= tempScale;
                    data.humidity *= humiScale;
                } else {
                    data.error_message = "串口未连接: " + portName;
                }
                found = true;
                break;
            }
        }

        if (!found) {
            data.error_message = "未找到串口: " + portName;
        }

        results.push_back(data);
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    return results;
}

bool MultiPortReader::isPortConnected(const std::string& portName) const {
    for (size_t i = 0; i < portNames_.size(); ++i) {
        if (portNames_[i] == portName) {
            return readers_[i]->isConnected();
        }
    }
    return false;
}
