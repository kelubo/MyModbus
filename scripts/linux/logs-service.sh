#!/bin/bash

echo "Modbus RTU Manager 服务日志 (按 Ctrl+C 退出):"
echo ""
sudo journalctl -u modbus-rtu-manager -f
