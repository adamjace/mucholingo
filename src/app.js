'use strict';

const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const Logger = require('./lib/logger')
const config = require('./config')
const Routes = require('./routes')

// create the app
let app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

// setup routing
Routes.makeRoutes(app)

// start the server
http.createServer(app).listen(`${config.port}`)
Logger.log(`Lingo Bot server running on port ${config.port}`)
