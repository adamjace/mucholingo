const t = require('../lib/translator')
const Logger = require('../lib/logger')
const languages = require('../lib/lang')
const mixpanel = require('../lib/mixpanel')
const db = require('../db/redis')
const _ = require('lodash')

class MessageHandler {

  static handleMessage(bot, payload, reply) {
    const { sender, message } = payload
    bot.getProfile(sender.id, (err, profile) => {
      if (err) throw err
      if (_.includes(message.text, '/getstarted')) return MessageHandler.handleGetStarted(sender, profile, reply)
      if (_.includes(message.text, '/change')) return MessageHandler.handleChange(sender, reply)
      // check if we have a context for translation
      db.getAsync(sender.id).then((context) => {
        if (context === null) return MessageHandler.handleNoContext(sender, message, reply)
        // we made it! translate the message
        MessageHandler.handleTranslation(context, sender, message, reply) 
      })
    })
  }

  static handleGetStarted(sender, profile, reply) {
    reply({
      text: `Hello, hola and bonjour! Let's get started. What language you would like me to translate for you? For example, type "english to spanish" or "german to french"`
    })
    mixpanel.setPerson(sender, profile)
    mixpanel.track('I click to get started', sender)
  }

  static handleChange(sender, reply) {
    db.delAsync(sender.id).then((err, resp) => {
      reply({
        text: `Sure thing! What language you would like me to translate for you now? For example, type "english to spanish" or "german to french"`
      })
      mixpanel.track('I change context', sender)
    })
  }

  static handleNoContext(sender, message, reply) {
    const context = MessageHandler.getContext(message.text)
    if (!context.has) {
      return reply({
        text: `I didn't quite catch that. Tell me what language you would like me to translate. For example, type "english to spanish" or "german to french"`
      })
      mixpanel.track('I incorrectly set context', sender, message)
    }
    return MessageHandler.handleContext(context, sender, message, reply)
  }

  static handleContext(context, sender, message, reply) {
    // we have context, store it and reply
    const contextValue = `${context.matches[0].code}:${context.matches[1].code}`
    db.setAsync(sender.id, contextValue).then((err, resp) => {
      return reply({
        text: `Got it! ${_.capitalize(context.matches[0].name)} to ${_.capitalize(context.matches[1].name)}. Now go ahead and tell me what to translate. Type "/change" at anytime to switch languages`
      })
      mixpanel.track('I set context', sender, message)
    })
  }

  static handleTranslation(context, sender, message, reply) {
    t.translate(message.text, context).
      then((result) => {
        reply({ text: result }, (err) => {
          if (err) throw err
          mixpanel.track('I send a message to be translated', sender)
        })
      }).
      catch((err) => {
        reply({ text: `Oh no, something has gone wrong. Please try that again` })
      })
  }

  static getContext(message) {
    let matches = []
    const words = message.split(' ')
    words.forEach((word) => {
      languages.filter(item => item.name === _.lowerCase(word)).map((lang) => {
        if (matches.length === 2) return
        matches.push(lang)
      })
    })
    return {
      has: matches.length === 2,
      matches: matches
    }
  }
}

module.exports = MessageHandler