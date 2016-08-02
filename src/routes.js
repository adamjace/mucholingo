const bot = require('./lib/bot')
const db = require('./db/redis')
const MessageHandler = require('./handler/message')

class Routes {

  static makeRoutes(app) {

    const get = (req, res)  => {
      return bot._verify(req, res)
    }

    const post = (req, res)  => {
      console.log(JSON.stringify(req.body))
      bot._handleMessage(req.body)
      res.end(JSON.stringify({status: 'ok'}))
    }

    const getKey = (req, res) => {
      db.getAsync(req.query.key).then(function(value) {
        res.send(value)
      });
    }

    const botTest = () => {
      bot.getProfile('adamjace', () => {
        console.log('in the callback')
      })
    }

    app.get('/', get)
    app.post('/', post)
    app.get('/test', MessageHandler.handleMessage)
    app.get('/getkey', getKey)
    app.get('/bot', botTest)
  }
}

module.exports = Routes