cmake_minimum_required(VERSION 3.10)
project(modbus_sensor_reader_cpp VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMAND ON)

if(WIN32)
    set(PLATFORM_LIBS ws2_32)
else()
    set(PLATFORM_LIBS pthread)
endif()

find_package(Threads REQUIRED)

find_package(SQLite3 REQUIRED)
if(NOT SQLite3_FOUND)
    message(WARNING "SQLite3 not found, SQLite storage will be disabled")
endif()

find_package(Boost COMPONENTS system filesystem REQUIRED)
if(Boost_FOUND)
    message(STATUS "Boost found: ${Boost_INCLUDE_DIRS}")
else()
    message(WARNING "Boost not found, some features may be disabled")
endif()

option(ENABLE_INFLUXDB "Enable InfluxDB support" OFF)
if(ENABLE_INFLUXDB)
    find_package(CURL REQUIRED)
endif()

option(BUILD_TESTING "Build tests" OFF)

set(SOURCE_FILES
    src/main.cpp
    src/sensor_reader.cpp
    src/data_storage.cpp
    src/config.cpp
)

set(HEADER_FILES
    include/sensor_reader.h
    include/data_storage.h
    include/config.h
)

source_group("Source Files" FILES ${SOURCE_FILES})
source_group("Header Files" FILES ${HEADER_FILES})

add_executable(modbus_sensor_reader_cpp
    ${SOURCE_FILES}
    ${HEADER_FILES}
)

target_include_directories(modbus_sensor_reader_cpp PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${SQLite3_INCLUDE_DIRS}
    ${Boost_INCLUDE_DIRS}
)

target_link_libraries(modbus_sensor_reader_cpp PRIVATE
    ${CMAKE_THREAD_LIBS_INIT}
    ${PLATFORM_LIBS}
    ${SQLite3_LIBRARIES}
    ${Boost_LIBRARIES}
)

if(WIN32)
    target_link_libraries(modbus_sensor_reader_cpp PRIVATE ws2_32)
endif()

if(ENABLE_INFLUXDB)
    target_link_libraries(modbus_sensor_reader_cpp PRIVATE ${CURL_LIBRARIES})
    target_compile_definitions(modbus_sensor_reader_cpp PRIVATE ENABLE_INFLUXDB=1)
endif()

install(TARGETS modbus_sensor_reader_cpp
    RUNTIME DESTINATION bin
)

if(BUILD_TESTING)
    enable_testing()
    add_subdirectory(tests)
endif()

print_configuration_summary()
