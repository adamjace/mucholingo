'use strict'

const Bot = require('messenger-bot')
const config = require('../config')
const MessageHandler = require('../handler/message')
const ErrorHandler = require('../handler/error')

let bot = new Bot({
  token: config.fb_token,
  verify: config.fb_verify,
  app_secret: config.fb_secret
})

const messageHandler = new MessageHandler(bot)
bot.on('error', ErrorHandler.handleError)
bot.on('message', messageHandler.handleMessage.bind(messageHandler))
bot.on('postback', messageHandler.handleMessage.bind(messageHandler))

module.exports = bot
