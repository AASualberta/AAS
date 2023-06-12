#!/bin/bash
cd "$(dirname "$0")"
if [ -e chromedriver ]
then
    export PATH=$PATH:${PWD}
    echo $(pwd)
fi

if [ ! -d "./log" ] 
then
	mkdir log
fi
#filename=./log/"$(date +"%Y_%m_%d_%I_%M_%p").log"
trap 'kill $(jobs -p)' SIGINT SIGTERM EXIT
sudo npm install -g chromedriver --detect_chromedriver_version
node index.js
wait # sleep until all background processes have exited, or a trap fires