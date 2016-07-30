const messageHandler = require('./handler/message')
const errorHandler = require('./handler/error')
const bot = require('./lib/bot')

class Routes {

  static makeRoutes(app) {

    const get = (req, res)  => {
      return bot._verify(req, res)
    }

    const post = (req, res)  => {
      bot._handleMessage(req.body)
      res.end(JSON.stringify({status: 'ok'}))
    }

    app.get('/', get)
    app.post('/', post)
    bot.on('error', errorHandler)
    bot.on('message', messageHandler)
  }
}

module.exports = Routes