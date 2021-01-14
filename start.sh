#!/bin/bash

trap 'kill $(jobs -p)' SIGINT SIGTERM EXIT
python3 test.py & node index.js

wait # sleep until all background processes have exited, or a trap fires