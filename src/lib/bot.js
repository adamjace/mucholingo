const Bot = require('messenger-bot')
const config = require('../config')

let bot = () => {
  return new Bot({
    token: config.fb_token,
    verify: config.fb_verify
  })
}

module.exports = bot()

