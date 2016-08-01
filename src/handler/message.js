const Translator = require('../lib/translator')
const Logger = require('../lib/logger')
const bot = require('../lib/bot')
const languages = require('../lib/language')
const mixpanel = require('../lib/mixpanel')
const db = require('../db/redis')
const _ = require('lodash')

const t = new Translator()

class MessageHandler {

  static handleMessage(req, res) {
   //static messageHandler(payload, reply) {
    //const { sender, message } = payload
    const self = MessageHandler
    const reply = (message) => {res.send(message)}
    const sender = {}
    const profile = {}
    const message = {}
    const err = false
    sender.id = req.query.id
    message.text = req.query.message
    
    //bot.getProfile(sender.id, (err, profile) => {
      if (err) throw err
      if (message.text === '/change') return MessageHandler._handleChange(sender, reply)
      // check if we have a context for translation
      db.getAsync(sender.id).then((value) => {
        if (value === null) return MessageHandler._handleNoContext(sender, message, reply)
        // we made it! translate the message :)
        MessageHandler._handleTranslation(sender, profile, message, reply) 
      })
    //})
  }

  static _handleChange(sender, reply) {
    db.setAsync(sender.id, null).then((err, resp) => {
      mixpanel.track('I change context', sender)
      reply({
        text: `Okay. What language you would like me to translate for you? For example, type "english to spanish" or "german to french"`
      })
    })
  }

  static _handleNoContext(sender, message, reply) {
    const context = MessageHandler._getContext(message.text)
    if (!context.has) {
      mixpanel.track('I incorrectly set context', sender, message)
      return reply({
        text: `I didn't quite catch that. Tell me what language you would like me to translate. For example, type "english to spanish" or "german to french"`
      })
    }
    return MessageHandler._handleContext(context, sender, message, reply)
  }

  static _handleContext(context, sender, message, reply) {
    // we have context, store it and reply
    const contextValue = `${context.matches[0]}-${context.matches[1]}`
    db.setAsync(sender.id, contextValue).then((err, resp) => {
      mixpanel.track('I set context', sender, message)
      return reply({
        text: `Got it! ${context.matches[0]} to ${context.matches[1]}. Now go ahead and tell me what to translate. Type "/change" at anytime to switch languages`
      })
    })
  }

  static _handleTranslation(sender, profile, message, reply) {
    // track user in mixpanel
    mixpanel.setPerson(sender, profile)
    // translate the message
    reply({ text: MessageHandler._translateMessage(message.text) }, (err) => {
      if (err) throw err
      mixpanel.track('I send a message to be translated', sender)
    })
  }

  static _getContext(message) {
    let matches = []
    const words = message.split(' ')
    words.forEach((word) => {
      if (_.includes(languages, word)) {
        matches.push(word)
        if (matches.length === 2) return
      }
    })
    return {
      has: matches.length === 2,
      matches: matches
    }
  }

  static _translateMessage(message, context) {
    return t.translate(message)
  }
}

module.exports = MessageHandler