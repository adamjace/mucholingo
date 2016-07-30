'use strict';

const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const Bot = require('messenger-bot')
const Logger = require('./src/lib/logger')
const config = require('./src/config')
const App = require('./src/app')

let bot = new Bot({
  token: config.fb_token,
  verify: config.fb_verify
})

let app = new App()
let server = express()

server.use(bodyParser.json())
server.use(bodyParser.urlencoded({
  extended: true
}))

server.get('/', (req, res) => {
  return bot._verify(req, res)
})

server.get('/hello', (req, res) => {
  return res.send('hello world!')
})

server.post('/', (req, res) => {
  bot._handleMessage(req.body)
  res.end(JSON.stringify({status: 'ok'}))
})

// listeners
bot.on('error', app.handleError)
bot.on('message', app.handleMessage)

http.createServer(server).listen(`${config.port}`)
Logger.log(`Lingo Bot server running on port ${config.port}`)