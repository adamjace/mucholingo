'use strict';

const Bot = require('messenger-bot')
const config = require('./config')
const Translator = require('./lib/translator')
const Logger = require('./lib/logger')

class App {

  handleError(err) {
    Logger.log(err.message)
  }

  handleMessage(payload, reply) {

    // check if the user exists
    // const user = db.getUser(payload.sender.id)
    // if (user !== null) {
    //   user = db.createUser(payload.sender)
    // }

    // if (user.context === null || user.context === undefined) {
    //   reply({
    //     text: `I'm sorry I didn't quite catch that. Simply say something like: "english to spanish" or "french to german"`
    //   })
    //   return;
    // }

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

  // function createUser(sender, cb) {
  //   const user = db.createUser(sender)
  //   return bot.getProfile(sender.id, cb)
  // }

  // function getUser() {

  // }

}

module.exports = App