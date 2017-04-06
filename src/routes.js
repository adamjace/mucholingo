'use strict'

const bot = require('./lib/bot')
const Logger = require('./lib/logger')

class Routes {

  static makeRoutes(app) {

    const get = (req, res)  => {
      return bot._verify(req, res)
    }

    const post = (req, res)  => {
      Logger.log('info', JSON.stringify(req.body))
      bot._handleMessage(req.body)
      res.send('ok')
    }

    app.get('/', get)
    app.post('/', post)
  }
}

module.exports = Routes
