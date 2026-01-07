cmake_minimum_required(VERSION 3.10)
project(modbus-temp-humidity C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

if(WIN32)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -D_WIN32")
else()
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -DLINUX")
endif()

add_executable(modbus_sensor_reader
    src/main.c
    src/sensor_reader.c
    src/data_storage.c
    src/config.c
)

target_include_directories(modbus_sensor_reader PRIVATE src)

find_library(LIBMODBUS NAMES libmodbus modbus)
if(LIBMODBUS)
    target_link_libraries(modbus_sensor_reader PRIVATE ${LIBMODBUS})
else()
    message(FATAL_ERROR "libmodbus not found. Please install libmodbus-dev or equivalent.")
endif()

find_package(SQLite3 REQUIRED)
if(SQLite3_FOUND)
    target_link_libraries(modbus_sensor_reader PRIVATE SQLite3::SQLite3)
else()
    message(FATAL_ERROR "SQLite3 not found. Please install sqlite3-dev or equivalent.")
endif()
