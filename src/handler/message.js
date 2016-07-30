const Translator = require('../lib/translator')
const Logger = require('../lib/logger')

const messageHandler = (bot, payload, reply) => {
  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) throw err
    Logger.log(`Received message from ${profile.id}`)
    const t = new Translator(user.context);
    reply({
      text: t.translate(payload.message.text)
    }, (err) => {
      if (err) throw err
      Logger.log(`Replied to ${profile.first_name} ${profile.last_name}: ${text}`)
    })
  })
}

module.exports = messageHandler