'use strict'

const fs = require('fs')
const http = require('http')
const https = require('https')
const express = require('express')
const bodyParser = require('body-parser')
const Logger = require('./lib/logger')
const config = require('./config')
const Routes = require('./routes')

const env = process.env.NODE_ENV || 'development';

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

// create https
if (env === 'production') {
  const options = {
    key: fs.readFileSync('ssl/key.pem'),
    cert: fs.readFileSync('ssl/cert.pem')
  }
  https.createServer(options, app).listen(443)
}

Logger.log(`Lingo Bot server running on port ${config.port}`)
