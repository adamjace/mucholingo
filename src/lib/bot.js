const Bot = require('messenger-bot')
const config = require('../config')
const MessageHandler = require('../handler/message')
const ErrorHandler = require('../handler/error')

let bot = new Bot({
  token: config.fb_token,
  verify: config.fb_verify,
  app_secret: config.fb_secret
})

bot.on('error', ErrorHandler.handleError)
bot.on('message', MessageHandler.handleMessage.bind(null, bot))

module.exports = bot

