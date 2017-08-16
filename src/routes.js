'use strict'

const bot = require('./lib/bot')

class Routes {

  static makeRoutes(app) {

    const get = (req, res)  => {
      return bot._verify(req, res)
    }

    const post = (req, res)  => {
      bot._handleMessage(req.body)
      // Facebook requires an immediate 200 OK response
      res.send('ok')
    }

    app.get('/', get)
    app.post('/', post)
  }
}

module.exports = Routes
