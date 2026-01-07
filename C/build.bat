@echo off

REM 设置编译器
set CC=gcc

REM 设置库和包含路径
set INCLUDE=-I.
set LIB=-lsqlite3 -lmodbus

REM 设置源文件
set SOURCES=src\main.c src\sensor_reader.c src\data_storage.c src\config.c

REM 设置输出文件名
set OUTPUT=modbus_sensor_reader.exe

echo 正在编译Modbus传感器读取器...

REM 编译命令
%CC% %INCLUDE% %SOURCES% %LIB% -o %OUTPUT%

if %ERRORLEVEL% equ 0 (
    echo 编译成功！
    echo 可执行文件: %OUTPUT%
    
    echo.
    echo 正在编译测试程序...
    set TEST_SOURCES=src\test.c src\sensor_reader.c src\data_storage.c src\config.c
    set TEST_OUTPUT=test_config.exe
    %CC% %INCLUDE% %TEST_SOURCES% %LIB% -o %TEST_OUTPUT%
    
    if %ERRORLEVEL% equ 0 (
        echo 测试程序编译成功！
        echo 可执行文件: %TEST_OUTPUT%
    ) else (
        echo 测试程序编译失败！
    )
) else (
    echo 主程序编译失败！
    exit /b 1
)
