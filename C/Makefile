CC = gcc
CFLAGS = -Wall -O2 -std=c99

ifeq ($(OS),Windows_NT)
    CFLAGS += -D_WIN32
    LDFLAGS = -lmodbus -lws2_32
    TARGET = modbus_sensor_reader.exe
    RM = del /Q
    SLASH = \
else
    UNAME_S := $(shell uname -s)
    ifeq ($(UNAME_S),Linux)
        CFLAGS += -DLINUX
    endif
    LDFLAGS = -lmodbus
    TARGET = modbus_sensor_reader
    RM = rm -f
    SLASH = /
endif

SRC_DIR = src
SRC = $(SRC_DIR)/main.c $(SRC_DIR)/sensor_reader.c
OBJ = $(SRC:.c=.o)

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

$(SRC_DIR)/%.o: $(SRC_DIR)/%.c
	$(CC) $(CFLAGS) -I$(SRC_DIR) -c -o $@ $<

clean:
	$(RM) $(TARGET) $(subst /,$(SLASH),$(OBJ)) 2>nul || $(RM) $(TARGET) $(OBJ)
