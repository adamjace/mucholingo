const Translator = require('../lib/translator')
const Logger = require('../lib/logger')
const languages = require('../lib/language')
const mixpanel = require('../lib/mixpanel')
const db = require('../db/redis')
const _ = require('lodash')

const t = new Translator()

class MessageHandler {

  static handleMessage(bot, payload, reply) {
    const { sender, message } = payload
    bot.getProfile(sender.id, (err, profile) => {
      if (err) throw err
      if (_.includes(message.text, '/getstarted')) return MessageHandler._handleGetStarted(sender, profile, reply)
      if (_.includes(message.text, '/change')) return MessageHandler._handleChange(sender, reply)
      // check if we have a context for translation
      db.getAsync(sender.id).then((value) => {
        if (value === null) return MessageHandler._handleNoContext(sender, message, reply)
        // we made it! translate the message
        MessageHandler._handleTranslation(sender, message, reply) 
      })
    })
  }

  static _handleGetStarted(sender, profile, reply) {
    reply({
      text: `Hello, hola and bonjour! Let's get started. What language you would like me to translate for you? For example, type "english to spanish" or "german to french"`
    })
    mixpanel.setPerson(sender, profile)
    mixpanel.track('I click to get started', sender)
  }

  static _handleChange(sender, reply) {
    db.delAsync(sender.id).then((err, resp) => {
      reply({
        text: `Sure thing! What language you would like me to translate for you now? For example, type "english to spanish" or "german to french"`
      })
      mixpanel.track('I change context', sender)
    })
  }

  static _handleNoContext(sender, message, reply) {
    const context = MessageHandler._getContext(message.text)
    if (!context.has) {
      return reply({
        text: `I didn't quite catch that. Tell me what language you would like me to translate. For example, type "english to spanish" or "german to french"`
      })
      mixpanel.track('I incorrectly set context', sender, message)
    }
    return MessageHandler._handleContext(context, sender, message, reply)
  }

  static _handleContext(context, sender, message, reply) {
    // we have context, store it and reply
    const contextValue = `${context.matches[0]}-${context.matches[1]}`
    db.setAsync(sender.id, contextValue).then((err, resp) => {
      return reply({
        text: `Got it! ${_.capitalize(context.matches[0])} to ${_.capitalize(context.matches[1])}. Now go ahead and tell me what to translate. Type "/change" at anytime to switch languages`
      })
      mixpanel.track('I set context', sender, message)
    })
  }

  static _handleTranslation(sender, message, reply) {
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
    return t.translate(message, context)
  }
}

module.exports = MessageHandler