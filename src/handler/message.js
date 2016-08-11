'use strict'

const t = require('../lib/translator')
const Logger = require('../lib/logger')
const languages = require('../lib/lang')
const mixpanel = require('../lib/mixpanel')
const db = require('../db/redis')
const _ = require('lodash')

const responseType = {
  getStarted: '!getstarted',
  change: '!change'
};

class MessageHandler {

  static handleMessage(bot, payload, reply) {

    const { sender, message, postback } = payload
    bot.setTyping(sender.id, true)
    bot.getProfile(sender.id, (err, profile) => {

      if (err) return Logger.log(err)

      db.getAsync(sender.id).then((context) => {
        if (postback && postback.payload === responseType.getStarted) {
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
      text: `Hola ${profile.first_name}, let's get started!\n\nI speak lots of different languages, so go ahead and tell me what to translate for you.\n\nFor example, type "english to spanish" or "greek to japanese"`
    }, () => {
      mixpanel.setPerson(sender, profile)
      mixpanel.track('I click to get started', sender)  
    })
  }

  static handleChange(sender, reply) {
    db.delAsync(sender.id).then((err, resp) => {
      return reply({
        text: `Sure thing. What language you would like me to translate for you now?`
      }, () => {
        mixpanel.track('I change context', sender)
      })
    })
  }

  static handleNoContext(sender, message, reply) {
    const context = MessageHandler.getContext(message.text)
    if (!context.hasTwo) {
      const text = `Hmmm... I didn't quite catch that. \n\nType, for example: "english to spanish" or "korean to portugese"`
      if (context.hasOne) text = `I only caught ${_.capitalize(context.matches[0])} in there. Type, for example: "english to spanish" or "korean to portugese"`
      return reply({
        text: text
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
        text: `${_.capitalize(context.matches[0].name)} to ${_.capitalize(context.matches[1].name)}. Got it! Now go ahead and tell me what to say.\n\nType "${responseType.change}" at anytime to switch languages`
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
      hasTwo: matches.length === 2,
      hasOne: matches.length === 1,
      hasNone: matches.length === 0,
      matches: matches
    }
  }
}

module.exports = MessageHandler