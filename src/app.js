'use strict';

const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const Bot = require('messenger-bot')
const Logger = require('./lib/logger')
const config = require('./config')
const Routes = require('./routes')

// create bot client
let bot = new Bot({
  token: config.fb_token,
  verify: config.fb_verify
})

// expressify the app
let app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

// setup routing
Routes.makeRoutes(app, bot)

// start the server
http.createServer(app).listen(`${config.port}`)
Logger.log(`Lingo Bot server running on port ${config.port}`)
