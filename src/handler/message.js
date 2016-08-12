'use strict'

const t = require('../lib/translator')
const Logger = require('../lib/logger')
const languages = require('../lib/lang')
const mixpanel = require('../lib/mixpanel')
const db = require('../db/redis')
const _ = require('lodash')

const responseType = {
  getStarted: '!getstarted',
  change: '!change',
  switch: '!switch'
}

class MessageHandler {

  // handleMessage is our main handler
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
        if (_.includes(message.text, responseType.switch)) {
          return MessageHandler.handleSwitch(context, sender, message, reply)
        }
        if (context === null) {
          return MessageHandler.handleNoContext(sender, profile, message, reply)
        }
        // we made it! translate the message
        MessageHandler.handleTranslation(context, sender, message, reply) 
      })
    })
  }

  // handleGetStarted
  static handleGetStarted(sender, profile, reply) {
    reply({
      text: `Hola ${profile.first_name}, let's get started!\n\nI speak lots of different languages, so go ahead and tell me what to translate for you.\n\nFor example, type "english to spanish" or "greek to japanese"`
    }, () => {
      mixpanel.setPerson(sender, profile)
      mixpanel.track('I click to get started', sender)  
    })
  }

  // handleChange
  static handleChange(sender, reply) {
    db.delAsync(sender.id).then((err) => {
      if (err) Logger.log(err)
      return reply({
        text: 'Sure thing. What language you would like me to translate for you now?'
      }, () => {
        mixpanel.track('I change context', sender)
      })
    })
  }

  // handleSwitch
  static handleSwitch(context, sender, message, reply) {
    if (context === null) {
      return reply({
        text: `I don't know what languages I'm supposed to be translating for you.\n\nType, for example: "thai to french" or "russian to dutch"`
      }) 
    }
    const values = context.split(':')
    const code = `${values[1]}:${values[0]}`
    const from = _.capitalize(getLanguageName(values[1]))
    const to = _.capitalize(getLanguageName(values[0]))
    return MessageHandler.handleSetContext(code, from, to, sender, message, reply)
  }

  // handleNoContext 
  static handleNoContext(sender, profile, message, reply) {
    const context = getContext(message.text)
    if (context.hasTwo) {
      const code = `${context.matches[0].code}:${context.matches[1].code}`
      const from = _.capitalize(context.matches[0].name)
      const to = _.capitalize(context.matches[1].name)
      return MessageHandler.handleSetContext(code, from, to, sender, message, reply)
    }
    if (MessageHandler.handleGeneralResponse(sender, profile, message, reply) !== false) {
      return 
    }
    
    let text = `Oops, I didn't quite catch that.\n\nType, for example: "english to spanish" or "korean to portugese"`
    if (context.hasOne) text = `I only caught ${_.capitalize(context.matches[0].name)} there.\n\nType, for example: "english to spanish" or "korean to portugese"`
    return reply({
      text: text
    }, () => {
      mixpanel.track('I incorrectly set context', sender, message)
    })
  }

  // handleGeneralResponse such as hello, goodbye etc
  static handleGeneralResponse(sender, profile, message, reply) {
    if (_.includes(['goodbye', 'bye', 'adios', 'ciao', 'seeya', 'see you', 'later'], message.text.toLowerCase())) {
      return reply({
        text: `Adiós ${profile.gender === 'male' ? 'muchacho' : 'muchacha'}`
      }, () => {
        mixpanel.track('I say goodbye without context', sender, message)
      })
    }
    if (_.includes(['hello', 'hi', 'howdy', 'hallo', 'yo', 'hey', 'sup', 'hiya'], message.text.toLowerCase())) {
      return reply({
        text: getRandom([`Hi ${profile.first_name}!`, 'Hello', '¡Hola!', `Hey ${profile.first_name}!`, 'Oh hey there!', 'Hallo', 'Howdy', 'Oh Hiiiiii'])
      }, () => {
        mixpanel.track('I say hello without context', sender, message)
      })
    }
    return false
  }

  // handleSetContext
  static handleSetContext(code, from, to, sender, message, reply) {
    db.setAsync(sender.id, code).then((err) => {
      if (err) Logger.log(err)
      return reply({
        text: `${from} to ${to}. Got it! Now go ahead and tell me what to say.\n\n To change languages at anytime, type "${responseType.change}"`
      }, () => {
        mixpanel.track('I set context', sender, message)
      })
    })
  }

  // handleTranslation
  static handleTranslation(context, sender, message, reply) {
    t.translate(message.text, context).
      then((result) => {
        reply({ text: result }, (err) => {
          if (err) Logger.log(err)
          mixpanel.track('I send a message to be translated', sender, message)
        })
      }).
      catch((err) => {
        if (err) Logger.log(err)
        reply({ text: 'Oh no, something has gone wrong. Please try that again' })
      })
  }
}

// private methods
// getContext
function getContext(message) {
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

// getRandom
function getRandom(responses) {
  return responses[Math.floor(Math.random()*responses.length)]
}

// getLanguageName
function getLanguageName(code) {
  return languages.filter(item => item.code === code).map((lang) => {
    return lang.name
  })
}

module.exports = MessageHandler