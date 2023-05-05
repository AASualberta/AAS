#!/bin/bash

if [ ! -d "./log" ] 
then
	mkdir log
fi
#filename=./log/"$(date +"%Y_%m_%d_%I_%M_%p").log"
trap 'kill $(jobs -p)' SIGINT SIGTERM EXIT
node index.js

wait # sleep until all background processes have exited, or a trap fires