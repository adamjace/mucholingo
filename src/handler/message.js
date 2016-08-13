'use strict'

const t = require('../lib/translator')
const Logger = require('../lib/logger')
const languages = require('../lib/lang')
const mixpanel = require('../lib/mixpanel')
const db = require('../db/redis')
const _ = require('lodash')

const responseType = {
  getStarted: '!getstarted',
  help: '#help',
  change: '#change',
  switch: '#switch',
  list: '#list'
}

class MessageHandler {

  // handleMessage is our main handler
  static handleMessage(bot, payload, reply) {

    const { sender, message, postback } = payload
    bot.setTyping(sender.id, true)
    bot.getProfile(sender.id, (err, profile) => {

      if (err) return Logger.log(err)

      db.getAsync(sender.id).then((context) => {
        if (postback && postback.payload) {
          return MessageHandler.handlePostBack(context, postback, profile, sender, reply)
        }
        if (_.includes(message.text, responseType.change)) {
          return MessageHandler.handleChange(sender, reply)
        }
        if (_.includes(message.text, responseType.switch)) {
          return MessageHandler.handleSwitch(context, sender, message, reply)
        }
        if (_.includes(message.text, responseType.help) || context === null && message.text === 'help') {
          return MessageHandler.handleHelp(context, sender, reply)
        }
        if (context === null) {
          return MessageHandler.handleNoContext(sender, profile, message, reply)
        }
        // we made it! translate the message
        MessageHandler.handleTranslation(context, sender, message, reply) 
      })
    })
  }

  // handlePostBack
  static handlePostBack(context, postback, profile, sender, reply) {
    if (postback.payload === responseType.getStarted) {
      return MessageHandler.handleGetStarted(sender, profile, reply)
    }
    if (postback.payload === responseType.change) {
      return MessageHandler.handleChange(sender, reply)
    }
    if (postback.payload === responseType.switch) {
      return MessageHandler.handleSwitch(context, sender, reply)
    }
    return null
  }

  // handleGetStarted
  static handleGetStarted(sender, profile, reply) {
    reply({
      text: `Hola ${profile.first_name}, let's get started!\n\nI speak lots of different languages, so go ahead and tell me what to translate for you.\n\nExample: "English to Spanish" or "Greek to Japanese"\n\nAsk for #help at any time`
    }, () => {
      mixpanel.setPerson(sender, profile)
      mixpanel.track('I click to get started', sender)  
    })
  }

  // handleHelp
  static handleHelp(context, sender, reply) {
    let options = [
      {
        'type': 'postback',
        'title': 'Show all languages',
        'payload': responseType.list
      }
    ]

    if (context !== null) {
      const switchedContext = switchContext(getContextFromCode(context))
      options.push(
        {
          'type': 'postback',
          'title': `${switchedContext.from} to ${switchedContext.to}`,
          'payload': responseType.switch
        },
        {
          'type': 'postback',
          'title': 'Change languages',
          'payload': responseType.change
        }
      )
    }

    return reply({
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': `Hey there! Here are some helpful shortcuts:\n\n"${responseType.change}" to change languages\n"${responseType.switch}" to switch languages\n\n Or choose a command:\n\n`,
          'buttons': options
        }
      }
    }, () => {
      mixpanel.track('I ask for help', sender)
    })
  }

  // handleChange
  static handleChange(sender, reply) {
    db.delAsync(sender.id).then((err) => {
      if (err) Logger.log(err)
      return reply({
        text: 'Sure thing. What language would you like me to translate for you now?\n\n Example: "English to German"'
      }, () => {
        mixpanel.track('I change context', sender)
      })
    })
  }

  // handleSwitch
  static handleSwitch(context, sender, reply) {
    if (context === null) {
      return reply({
        text: `Hmmm... I don't know what language I'm supposed to be translating for you.\n\nExample: "Thai to French" or "Russian to Dutch"`
      }) 
    }
    context = switchContext(getContextFromCode(context))
    return MessageHandler.handleSetContext(context.code, context.from, context.to, sender, null, reply)
  }

  // handleNoContext 
  static handleNoContext(sender, profile, message, reply) {
    const context = getContextFromMessage(message.text)
    if (context.hasTwo) {
      return MessageHandler.handleSetContext(context.code, context.from, context.to, sender, message, reply)
    }
    if (MessageHandler.handleGeneralResponse(sender, profile, message, reply) !== false) {
      return 
    }
    
    let text = `Oops, I didn't quite catch that.\n\nSay something like "English to Spanish" or "Korean to Portugese"`
    if (context.hasOne) text = `I only caught ${context.from} there. Please try again`
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
        text: `${from} to ${to}. Got it! Now go ahead and tell me what to say.\n\nAsk for "${responseType.help}" at any time`
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
// getContextFromMessage
function getContextFromMessage(message) {
  const ctxMatches = getContextMatches(message)
  const { hasTwo, hasOne, hasNone } = ctxMatches
  let code = null 
  let from = null
  let to = null

  if (hasOne || hasTwo) {
    from = _.capitalize(ctxMatches.matches[0].name)
  }
  if (hasTwo) {
    code = `${ctxMatches.matches[0].code}:${ctxMatches.matches[1].code}`
    to = _.capitalize(ctxMatches.matches[1].name)
  }
  return { code, from, to, hasTwo, hasOne, hasNone }
}

// getContextFromCode
function getContextFromCode(code) {
  const codes = code.split(':')
  return {
    code,
    from: _.capitalize(getLanguageName(codes[0])),
    to: _.capitalize(getLanguageName(codes[1])),
    hasTwo: true
  }
}

// getContext
function getContextMatches(message) {
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

// switchContext
function switchContext(context) {
  const values = context.code.split(':')
  const from = context.to
  const to = context.from

  context.code = `${values[1]}:${values[0]}`
  context.from = from
  context.to = to

  return context
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