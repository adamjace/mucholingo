'use strict'

const Promise = require('bluebird')
const t = require('../lib/translator')
const Logger = require('../lib/logger')
const languages = require('../lib/lang')
const mixpanel = require('../lib/mixpanel')
const state = require('../lib/state')
const repo = require('../db/repo')
const config = require('../config')
const _ = require('lodash')

const maxTextReplyLength = 320

const responseType = {
  help: '#help',
  getStarted: '#getstarted',
  reset: '#reset',
  switch: '#switch',
  list: '#list'
}

const baseHelpOptions = [
  {
    'type': 'postback',
    'title': 'Show all languages',
    'payload': responseType.list
  }
]

const helpQuickReply = {
  'content_type': 'text',
  'title': 'Need help?',
  'payload': '#help'
}

const examples = [
  'English', 'German', 'Italian', 'Korean', 'Dutch', 'Japanese', 'Hindi', 'Spanish', 'French', 'Indonesian', 'Russian', 'Chinese', 'Greek'
]

class MessageHandler {

  constructor(bot) {
    this.bot = bot
  }

  // pseudo middleware handler
  next(sender) {
    let next = this.bot
    const profile = state.get(sender.id)
    if (profile !== undefined) {
      next = {
        getProfile: (id, cb) => {
          cb(null, profile)
        }
      }
    }
    return next
  }

  // typing sends a typing response to the recipient
  typing(sender) {
    this.bot.setTyping(sender.id, true)
  }

  // handleMessage is our main handler
  handleMessage(payload, reply) {

    const { sender, message, postback } = payload

    // we don't care about handling our own responses
    if (sender.id === config.fb_page_id) return

    return new Promise((resolve) => {

      this.next(sender).getProfile(sender.id, (err, profile) => {
        if (err) return Logger.log(`getProfileError: ${JSON.stringify(err)}`)
        // cache the user for subsequent requests
        state.set(sender.id, profile)

        repo(sender.id).get().then((response, err) => {
          if (err) Logger.log(`getAsyncError: ${JSON.stringify(err)}`)

          const { context } = response

          // check for postbacks
          if (postback && postback.payload) {
            return resolve(this.handlePostBack(context, postback, profile, sender, reply))
          }
          // check if a quick reply (comes in as a message)
          else if (message && message.quick_reply && message.quick_reply.payload) {
            return resolve(this.handlePostBack(context, message.quick_reply, profile, sender, reply))
          }

          // not a postback and not a text message, return
          else if (!message.text) return resolve(false)

          else if (_.includes(message.text.toLowerCase(), 'help') && !context) {
            return resolve(this.handleHelp(context, profile, sender, reply))
          }
          // reset or switch command
          else if (message.text === responseType.reset || message.text === responseType.switch) {
            return resolve(this.handlePostBack(context, {payload: message.text}, profile, sender, reply))
          }
          // no context
          else if (!context) {
            return resolve(this.handleNoContext(sender, profile, message, reply))
          }
          // we have context and the user has sent a text message, before translation check if this is
          // a possible direct change command: {lang} to {lang}
          else if (isPossibleChangeCommand(message.text)) {
            const context = getContextFromMessage(message.text, true)
            if (context.hasTwo && context.from !== context.to) {
              return (resolve(this.handleSetContext(context.code, context.from, context.to, sender, null, reply)))
            }
          }
          // we made it! translate the message
          return resolve(this.handleTranslation(context, sender, message, reply))
        })
      })
    })
  }

  // handlePostBack
  handlePostBack(context, postback, profile, sender, reply) {
    Logger.log('handlePostBack')
    if (postback.payload === responseType.getStarted) {
      return this.handleGetStarted(sender, profile, reply)
    }
    else if (postback.payload === responseType.help) {
      return this.handleHelp(context, profile, sender, reply)
    }
    else if (postback.payload === responseType.reset) {
      return this.handleReset(sender, reply)
    }
    else if (postback.payload === responseType.switch) {
      return this.handleSwitch(context, sender, reply)
    }
    else if (postback.payload === responseType.list) {
      return this.handleShowAllLanguages(sender, reply)
    }
  }

  // handleGetStarted
  handleGetStarted(sender, profile, reply) {
    Logger.log('handleGetStarted')
    reply({
      text: `Hola ${profile && profile.first_name}! Start by telling me what languages to translate for you. Say something like ${getSmartExample(profile)}\n\nAsk me for "help" at any time`
    }, () => {
      mixpanel.setPerson(sender, profile)
      mixpanel.track('I click to get started', sender)
    })
  }

  // handleHelp
  handleHelp(context, profile, sender, reply) {
    Logger.log('handleHelp')
    let text = `Hola. I see you've asked for some help... \n\nTell me what languages to translate by saying something like ${getSmartExample(profile)}`
    let options = baseHelpOptions

    if (context) {
      context = getContextFromCode(context)
      text = `Hola again. I see you've asked for some help...\n\nI'm currently translating everything you say from ${context.from} to ${context.to}\n\n`
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
  // due to Facebook's payload size limit we need to chunk the list into seprate bits
  handleShowAllLanguages(sender, reply) {
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
  handleReset(sender, reply) {
    repo(sender.id).set('').then((err) => {
      if (err) Logger.log(err)
      return reply({
        text: 'OK, what should I translate for you next?'
      }, () => {
        mixpanel.track('I reset context', sender)
      })
    })
  }

  // handleSwitch
  handleSwitch(context, sender, reply) {
    context = switchContext(getContextFromCode(context))
    return this.handleSetContext(context.code, context.from, context.to, sender, null, reply)
  }

  // handleNoContext
  handleNoContext(sender, profile, message, reply) {
    Logger.log('handleNoContext')
    const context = getContextFromMessage(message.text)
    if (context.hasTwo && context.from !== context.to) {
      return this.handleSetContext(context.code, context.from, context.to, sender, message, reply)
    }
    if (this.handleGeneralResponse(sender, profile, message, reply) !== false) {
      return
    }

    let text = 'Oops, I didn\'t quite catch that. Ask me for "help" at anytime'
    if (context.hasOne) text = `I only caught ${context.from} in there. Try again, or ask me for "help"`
    return reply({
      text: text
    }, () => {
      mixpanel.track('I incorrectly set context', sender, message)
    })
  }

  // handleGeneralResponse such as hello, goodbye etc
  handleGeneralResponse(sender, profile, message, reply) {
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
    if (_.includes(message.text.toLowerCase(), 'hmm')) {
      return reply({ text: 'hmmmm...' })
    }
    return false
  }

  // handleSetContext
  handleSetContext(code, from, to, sender, message, reply) {
    Logger.log('handleSetContext')
    repo(sender.id).set(code).then((err) => {
      if (err) Logger.log(err)
      return reply({
        text: `${from} to ${to}. Got it! Now go ahead and tell me what to say.`
      }, () => {
        mixpanel.track('I set context', sender, message)
      })
    })
  }

  // handleTranslation
  handleTranslation(context, sender, message, reply) {
    let response = {}
    t.translate(message.text, context).
      then((result) => {
        if (result.length > maxTextReplyLength) {
          return reply({text: 'I\'m sorry, I can\'t translate all of that in one go. Try again with a smaller message'})
        }
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

  // _privates
  // expose these for tests
  _privates() {
    return {
      getContextFromMessage: getContextFromMessage,
      getContextFromCode: getContextFromCode,
      switchContext: switchContext,
      getLanguageName: getLanguageName,
      getAllLanguageNames: getAllLanguageNames,
      getLanguageNameLocale: getLanguageNameLocale,
      getSmartExample: getSmartExample,
      isPossibleChangeCommand: isPossibleChangeCommand
    }
  }
}

// private methods
// getContextFromMessage
function getContextFromMessage(message, strict) {
  const ctxMatches = getContextMatches(message, strict)
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
    from: getLanguageName(codes[0]),
    to: getLanguageName(codes[1]),
    hasTwo: true
  }
}

// getContext
function getContextMatches(message, strict) {
  let matches = []
  const words = message.split(' ')
  if (!strict || (strict && words.length === 3)) {
    words.forEach((word) => {
      languages.filter(item => item.name === _.lowerCase(word)).map((lang) => {
        if (matches.length === 2) return
        matches.push(lang)
      })
    })
  }
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
  const name = languages.filter(item => item.code === code).map((lang) => {
    return lang.name
  })
  if (name && name.length) return _.capitalize(name[0])
}

// listAllLanguages
function getAllLanguageNames() {
  let list = []
  languages.forEach(function(lang) {
    list.push(_.capitalize(lang.name))
  })
  return list
}

// getLanguageNameLocale
function getLanguageNameLocale(profile) {
  if (!profile || (profile && !profile.locale || profile.locale.indexOf('_') === -1)) return
  const code = profile.locale.split('_')[0]
  return getLanguageName(code)
}

// getRandom
function getRandom(responses) {
  return responses[Math.floor(Math.random()*responses.length)]
}

// getSmartExample
function getSmartExample(profile) {
  const locale = getLanguageNameLocale(profile)
  let shuffled = shuffleArray(_.clone(examples))
  if (!locale) return `"${shuffled[0]} to ${shuffled[1]}"`

  shuffled = _.remove(shuffled, (n) => { return n !== locale })
  return `"${locale} to ${shuffled[0]}"`
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

// isPossibleChangeCommand
function isPossibleChangeCommand(message) {
  const words = message.split(' ')
  return words.length === 3 && words[1] === 'to'
}

module.exports = MessageHandler
