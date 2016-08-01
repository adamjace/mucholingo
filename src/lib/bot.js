const Bot = require('messenger-bot')
const config = require('../config')
const messageHandler = require('../handler/message')
const errorHandler = require('../handler/error')

const bot = new Bot({
  token: config.fb_token,
  verify: config.fb_verify
})

bot.on('error', errorHandler)
bot.on('message', messageHandler)

module.exports = (() => {
  return bot
})()

