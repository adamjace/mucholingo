#!/bin/bash
fuser -n tcp -k 8080
fuser -n tcp -k 443
NODE_ENV=production 
forever stopall
sudo forever start --minUptime=5000 src/app.js
