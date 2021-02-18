#!/bin/bash
if [ ! -d "./log" ] 
then
	mkdir log
fi
filename=./log/"$(date +"%Y_%m_%d_%I_%M_%p").log"
trap 'kill $(jobs -p)' SIGINT SIGTERM EXIT
python3 test.py & node index.js > $filename

wait # sleep until all background processes have exited, or a trap fires