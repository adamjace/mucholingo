#!/bin/bash
sudo killall -9 node
forever stopall
sudo forever start --minUptime=5000 src/app.js
