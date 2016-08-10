'use strict'

const fs = require('fs')
const http = require('http')
const https = require('https')
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

// start https
const options = {
  key: fs.readFileSync('ssl/lost1n.space.key'),
  cert: fs.readFileSync('ssl/lost1n.space.crt'),
  ca: [fs.readFileSync('ssl/gd_bundle-g2-g1.crt')]
}
https.createServer(options, app).listen(443)
Logger.log('Server running over https')

// start the (non https) server
http.createServer(app).listen(`${config.port}`)
Logger.log(`Server running over http on port ${config.port}`)



