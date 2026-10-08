#!/bin/sh
cd "$(dirname "$0")" || exit 1
python3 scripts/install.py
result=$?
printf '\n安装结束，按回车关闭。'
read -r answer
exit "$result"
