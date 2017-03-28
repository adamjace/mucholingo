'use strict'

require('dotenv').config()
const fs = require('fs')
const http = require('http')
const https = require('https')
const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config')
const Logger = require('./lib/logger')
const Routes = require('./routes')

// create the app
let app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

// setup routing
Routes.makeRoutes(app)

// start https
const options = {
  key: fs.readFileSync(config.ssl_key),
  cert: fs.readFileSync(config.ssl_cert),
  ca: [fs.readFileSync(config.ssl_ca)]
}
https.createServer(options, app).listen(443)
Logger.log('Server running over https')

// start the (non https) server
http.createServer(app).listen(`${config.port}`)
Logger.log(`Server running over http on port ${config.port}`)
