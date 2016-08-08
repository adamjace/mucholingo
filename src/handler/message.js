'use strict'

const t = require('../lib/translator')
const Logger = require('../lib/logger')
const languages = require('../lib/lang')
const mixpanel = require('../lib/mixpanel')
const db = require('../db/redis')
const _ = require('lodash')

const responseType = {
  getStarted: 'Get Started',
  change: '/change'
};

class MessageHandler {

  static handleMessage(bot, payload, reply) {

    const { sender, message } = payload
    bot.setTyping(sender.id, true)
    bot.getProfile(sender.id, (err, profile) => {

      if (err) return Logger.log(err)

      db.getAsync(sender.id).then((context) => {
        if (_.includes(message.text, responseType.getStarted)) {
          return MessageHandler.handleGetStarted(sender, profile, reply)
        }
        if (_.includes(message.text, responseType.change)) {
          return MessageHandler.handleChange(sender, reply)
        }
        if (context === null) {
          return MessageHandler.handleNoContext(sender, message, reply)
        }
        // we made it! translate the message
        MessageHandler.handleTranslation(context, sender, message, reply) 
      })
    })
  }

  static handleGetStarted(sender, profile, reply) {
    reply({
      text: `Hello there ${profile.first_name}! What languages am I translating for you? For example, type "english to spanish" or "german to french"`
    }, () => {
      mixpanel.setPerson(sender, profile)
      mixpanel.track('I click to get started', sender)  
    })
  }

  static handleChange(sender, reply) {
    db.delAsync(sender.id).then((err, resp) => {
      return reply({
        text: `Sure thing! What language you would like me to translate for you now? For example, type "english to spanish" or "german to french"`
      }, () => {
        mixpanel.track('I change context', sender)
      })
    })
  }

  static handleNoContext(sender, message, reply) {
    const context = MessageHandler.getContext(message.text)
    if (!context.has) {
      return reply({
        text: `I didn't quite catch that. Type, for example: "english to spanish" or "german to french"`
      }, () => {
        mixpanel.track('I incorrectly set context', sender, message)
      })
    }
    return MessageHandler.handleIncomingContext(context, sender, message, reply)
  }

  static handleIncomingContext(context, sender, message, reply) {
    // we have context, store it and reply
    const contextValue = `${context.matches[0].code}:${context.matches[1].code}`
    db.setAsync(sender.id, contextValue).then((err, resp) => {
      return reply({
        text: `${_.capitalize(context.matches[0].name)} to ${_.capitalize(context.matches[1].name)}. Got it! Now go ahead and tell me what to translate. Type "/change" at anytime to switch languages`
      }, () => {
        mixpanel.track('I set context', sender, message)
      })
    })
  }

  static handleTranslation(context, sender, message, reply) {
    t.translate(message.text, context).
      then((result) => {
        reply({ text: result }, (err) => {
          if (err) Logger.log(err)
          mixpanel.track('I send a message to be translated', sender, message)
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