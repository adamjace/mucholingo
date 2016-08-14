'use strict'

const t = require('../lib/translator')
const Logger = require('../lib/logger')
const languages = require('../lib/lang')
const mixpanel = require('../lib/mixpanel')
const db = require('../db/redis')
const _ = require('lodash')

const responseType = {
  help: '#help',
  getStarted: '#getstarted',
  reset: '#reset',
  switch: '#switch',
  list: '#list'
}

const helpQuickReply = {
  'content_type': 'text',
  'title': 'Need help?',
  'payload': '#help'
}


const examples = [
  'English', 'German', 'Italian', 'Korean', 'Dutch', 'Polish', 'Hindi', 'Spanish', 'French', 'Indonesian', 'Russian', 'Chinese', 'Greek'
]

class MessageHandler {

  // handleMessage is our main handler
  static handleMessage(bot, payload, reply) {

    const { sender, message, postback } = payload
    bot.setTyping(sender.id, true)
    bot.getProfile(sender.id, (err, profile) => {

      if (err) return Logger.log(err)

      db.getAsync(sender.id).then((context) => {
        // check for postbacks
        if (postback && postback.payload) {
          return MessageHandler.handlePostBack(context, postback, profile, sender, reply)
        }
        if (message && message.quick_reply && message.quick_reply.payload) {
          return MessageHandler.handlePostBack(context, message.quick_reply, profile, sender, reply)
        }
        if (_.includes(message.text.toLowerCase(), 'help') && context === null) {
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
    if (postback.payload === responseType.help) {
      return MessageHandler.handleHelp(context, sender, reply)
    }
    if (postback.payload === responseType.reset) {
      return MessageHandler.handleReset(sender, reply)
    }
    if (postback.payload === responseType.switch) {
      return MessageHandler.handleSwitch(context, sender, reply)
    }
    if (postback.payload === responseType.list) {
      return MessageHandler.handleShowAllLanguages(sender, reply)
    }
  }

  // handleGetStarted
  static handleGetStarted(sender, profile, reply) {
    reply({
      text: `Hola ${profile.first_name}, let's get started!\n\nI speak lots of different languages, so go ahead and tell me what to translate for you.\n\nExample: ${getRandomExample()}\n\nAsk me for "help" at any time`
    }, () => {
      mixpanel.setPerson(sender, profile)
      mixpanel.track('I click to get started', sender)  
    })
  }

  // handleHelp
  static handleHelp(context, sender, reply) {
    let text = `Oh, hi there! I speak 90 different languages.\n\n So I can translate stuff for you, you'll need to start off by saying something like ${getRandomExample()}`
    let options = [
      {
        'type': 'postback',
        'title': 'Show all languages',
        'payload': responseType.list
      }
    ]

    if (context !== null) {
      context = getContextFromCode(context)
      text = `Hello! Just to remind you I'm currently translating everything you say from ${context.from} to ${context.to}\n\n`
      options.unshift(
        {
          'type': 'postback',
          'title': 'Reset',
          'payload': responseType.reset
        },
        {
          'type': 'postback',
          'title': `${context.to} to ${context.from}`,
          'payload': responseType.switch
        }
      )
    }

    return reply({
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': text,
          'buttons': options
        }
      }
    }, () => {
      mixpanel.track('I ask for help', sender)
    })
  }

  // handleShowAllLanguages
  // due to FBs payload size limit we need to chunk the list into seprate bits 
  static handleShowAllLanguages(sender, reply) {
    const list = getAllLanguageNames()
    const first = list.splice(0, list.length / 3)
    const second = list.splice(0, list.length / 2)
    reply({text: `OK, here goes...\n\n${first.toString().replace(/,/g, ', ')}`}, () => {
      reply({text: `${second.toString().replace(/,/g, ', ')}`}, () => {
        reply({text: `${list.toString().replace(/,/g, ', ')}\n\n *GASP*`})
      }) 
    }) 
  }

  // handleReset
  static handleReset(sender, reply) {
    db.delAsync(sender.id).then((err) => {
      if (err) Logger.log(err)
      return reply({
        text: `OK, what language would you like me to translate for you now?\n\n Example: ${getRandomExample()}`
      }, () => {
        mixpanel.track('I reset context', sender)
      })
    })
  }

  // handleSwitch
  static handleSwitch(context, sender, reply) {
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
    
    let text = `Oops, I didn't quite catch that.\n\n Ask me for "help" at anytime`
    if (context.hasOne) text = `I only caught ${context.from} in there. Try again, or ask me for "help"`
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
        text: `${from} to ${to}. Got it! Now go ahead and tell me what to say.\n\nAsk for "help" at any time`
      }, () => {
        mixpanel.track('I set context', sender, message)
      })
    })
  }

  // handleTranslation
  static handleTranslation(context, sender, message, reply) {
    let response = {}
    t.translate(message.text, context).
      then((result) => {
        response.text = result
        // check if the user actually wants help by passing a quick reply button with the translated text
        if (_.includes(message.text.toLowerCase(), 'help')) {
          response.quick_replies = [helpQuickReply]
        }
        reply(response, (err) => {
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
  let code, from, to
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

// getLanguageName
function getLanguageName(code) {
  return languages.filter(item => item.code === code).map((lang) => {
    return lang.name
  })
}

// listAllLanguages
function getAllLanguageNames() {
  let list = []
  languages.forEach(function(lang) {
    list.push(_.capitalize(lang.name))
  })
  return list
}

// getRandom
function getRandom(responses) {
  return responses[Math.floor(Math.random()*responses.length)]
}

// getRandomExample
function getRandomExample() {
  const shuffled = shuffleArray(examples)
  return `"${shuffled[0]} to ${shuffled[1]}"`
}

// shuffleArray
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

module.exports = MessageHandler