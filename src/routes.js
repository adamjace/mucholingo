'use strict'

const bot = require('./lib/bot')
const db = require('./db/redis')
const Logger = require('./lib/logger')
const MessageHandler = require('./handler/message')

class Routes {

  static makeRoutes(app) {

    const get = (req, res)  => {
      return bot._verify(req, res)
    }

    const post = (req, res)  => {
      Logger.log(JSON.stringify(req.body))
      bot._handleMessage(req.body)
      res.end(JSON.stringify({status: 'ok'}))
    }

    app.get('/', get)
    app.post('/', post)
  }
}

module.exports = Routes
