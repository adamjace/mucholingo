'use strict'

const Promise = require('bluebird')
const ProfileHandler = require('./profile')
const Logger = require('../lib/logger')
const Localise = require('../locale/localise')
const translate = require('../lib/translator')
const languages = require('../lib/lang')
const mixpanel = require('../lib/mixpanel')
const state = require('../lib/state')
const _const = require('../lib/constants')
const repo = require('../db/repo')
const config = require('../config')
const _ = require('lodash')

class MessageHandler {

  constructor(bot) {
    this.profileHandler = new ProfileHandler(bot)
  }

  // handleMessage is our main message handler
  // We need to handle all incoming messages that may be:
  // postbacks, quick replies, help commands and translations
  handleMessage(payload, reply) {

    const { sender, message, postback } = payload

    // clear state if we need to
    state.flushIfSizeLimitExceeded()

    // we don't care about handling our own responses
    if (sender.id === config.fb_page_id)
      return false

    return new Promise((resolve, reject) => {

      // getProfile retrieves user data from state first if it exists, otherwise
      // performs an aysnc call to Facebook to get the users information
      this.profileHandler.getProfile(sender, (err, profile) => {

        if (err) {
          Logger.log(`getProfile error: ${JSON.stringify(err)}`)
          reject(err)
        }

        // cache the user for subsequent requests
        state.set(sender.id, profile)

        // create new localised translator
        // this is used for conversations between the bot and the user
        const t = new Localise(getLocale(profile))

        // retrieve the users context (their translation mode) from state if it
        // exists, otherwise perform a fetch from redis
        repo(sender.id).get().then((response, err) => {

          if (err) {
            Logger.log(`redis get error: ${JSON.stringify(err)}`)
            reject(err)
          }

          if (postback && postback.payload) {
            return resolve(this.handlePostBack(response.context, postback, profile, sender, reply, t))
          }
          else if (message && message.quick_reply && message.quick_reply.payload) {
            return resolve(this.handlePostBack(response.context, message.quick_reply, profile, sender, reply, t))
          }
          else if (!message.text) {
            return resolve(false)
          }
          else if (_.includes(message.text.toLowerCase(), t.say('help')) && !response.context) {
            return resolve(this.handleHelp(response.context, profile, sender, reply, t))
          }
          else if (message.text === _const.responseType.reset || message.text === _const.responseType.switch) {
            return resolve(this.handlePostBack(response.context, {payload: message.text}, profile, sender, reply, t))
          }
          else if (!response.context) {
            return resolve(this.handleNoContext(sender, profile, message, reply, t))
          }
          else if (isPossibleChangeCommand(message.text)) {
            // we have context and the user has sent a text message, before translation check if this is
            // a possible direct change command: {lang} to {lang}
            const context = getContextFromMessage(message.text, true)
            if (context.hasTwo && context.from !== context.to) {
              return (resolve(this.handleSetContext(context.code, context.from, context.to, sender, null, reply, t)))
            }
          }
          // we made it! translate the message
          return resolve(this.handleTranslation(response.context, sender, message, reply, t))
        })
      })
    })
  }

  // handlePostBack
  handlePostBack(context, postback, profile, sender, reply, t) {
    Logger.log('handlePostBack')
    if (postback.payload === _const.responseType.getStarted) {
      return this.handleGetStarted(sender, profile, reply, t)
    }
    else if (postback.payload === _const.responseType.help) {
      return this.handleHelp(context, profile, sender, reply, t)
    }
    else if (postback.payload === _const.responseType.reset) {
      return this.handleReset(sender, reply, t)
    }
    else if (postback.payload === _const.responseType.switch) {
      return this.handleSwitch(context, sender, reply, t)
    }
    else if (postback.payload === _const.responseType.list) {
      return this.handleShowAllLanguages(sender, reply, t)
    }
  }

  // handleGetStarted
  handleGetStarted(sender, profile, reply, t) {
    Logger.log('handleGetStarted')
    const suggestion = getContextSuggestion(profile)
    return reply({
      text: t.say('getting_started', profile && profile.first_name, suggestion[0], suggestion[1]),
    }, () => {
      mixpanel.setPerson(sender, profile)
      mixpanel.track('I click to get started', sender)
    })
  }

  // handleHelp
  handleHelp(context, profile, sender, reply, t) {
    Logger.log('handleHelp')
    const suggestion = getContextSuggestion(profile)
    let text = t.say('ask_for_help', suggestion[0], suggestion[1])
    let options = _.clone(_const.baseHelpOptions)

    if (context) {
      context = getContextFromCode(context)
      text = t.say('ask_for_help_with_context', context.from, context.to)
      options.unshift(
        {
          'type': 'postback',
          'title': t.say('reset'),
          'payload': _const.responseType.reset
        },
        {
          'type': 'postback',
          'title': t.say('lang_to_lang', context.to, context.from),
          'payload': _const.responseType.switch
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
  handleShowAllLanguages(sender, reply, t) {
    const list = getAllLanguageNames()
    const first = list.splice(0, list.length / 3)
    const second = list.splice(0, list.length / 2)
    reply({text: `${t.say('ok_here_goes')}\n\n${first.toString().replace(/,/g, ', ')}`}, () => {
      reply({text: `${second.toString().replace(/,/g, ', ')}`}, () => {
        reply({text: `${list.toString().replace(/,/g, ', ')}\n\n ${t.say('gasp')}`})
      })
    })
  }

  // handleReset
  handleReset(sender, reply, t) {
    repo(sender.id).set('').then((err) => {
      if (err) Logger.log(err)
      return reply({
        text: t.say('translate_next')
      }, () => {
        mixpanel.track('I reset context', sender)
      })
    })
  }

  // handleSwitch
  handleSwitch(context, sender, reply, t) {
    context = switchContext(getContextFromCode(context))
    return this.handleSetContext(context.code, context.from, context.to, sender, null, reply, t)
  }

  // handleNoContext
  handleNoContext(sender, profile, message, reply, t) {
    Logger.log('handleNoContext')
    const context = getContextFromMessage(message.text)
    if (context.hasTwo && context.from !== context.to) {
      return this.handleSetContext(context.code, context.from, context.to, sender, message, reply, t)
    }
    if (this.handleGeneralResponse(sender, profile, message, reply, t) !== false) {
      return
    }

    let text = t.say('unreconised')
    if (context.hasOne) text = t.say('part_unrecognised', context.from)
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
    if (_.includes(['hello', 'hi', 'howdy', 'hallo', 'yo', 'hey', 'sup', 'hiya', 'hola'], message.text.toLowerCase())) {
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
  handleSetContext(code, from, to, sender, message, reply, t) {
    Logger.log('handleSetContext')
    repo(sender.id).set(code).then((err) => {
      if (err) Logger.log(err)
      return reply({
        text: t.say('set_context', from, to)
      }, () => {
        mixpanel.track('I set context', sender, message)
      })
    })
  }

  // handleTranslation
  handleTranslation(context, sender, message, reply, t) {
    let response = {}
    translate(message.text, context).
      then((result) => {
        if (result.length > _const.maxTextReplyLength) {
          return reply({text: t.say('too_long')})
        }
        response.text = result
        // check if the user actually wants help by passing a quick reply button with the translated text
        if (_.includes(message.text.toLowerCase(), t.say('help'))) {
          response.quick_replies = [_const.helpQuickReply]
        }
        reply(response, (err) => {
          if (err) Logger.log(err)
          mixpanel.track('I send a message to be translated', sender, message)
        })
      }).
      catch((err) => {
        if (err) Logger.log(err)
        reply({ text: t.say('translation_error') })
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
      getLocale: getLocale,
      getLanguageNameLocale: getLanguageNameLocale,
      getContextSuggestion: getContextSuggestion,
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

// getContextMatches
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

// getLocale
function getLocale(profile) {
  if (!profile || (profile && !profile.locale || profile.locale.indexOf('_') === -1)) return
  return profile.locale.split('_')[0]
}

// getLanguageNameLocale
function getLanguageNameLocale(profile) {
  const code = getLocale(profile)
  return code && getLanguageName(code)
}

// getRandom
function getRandom(responses) {
  return responses[Math.floor(Math.random()*responses.length)]
}

// getContextSuggestion
function getContextSuggestion(profile) {
  const locale = getLanguageNameLocale(profile)
  let shuffled = shuffleArray(_.clone(_const.languageExamples))
  if (!locale) return shuffled.splice(0, 2)

  shuffled = _.remove(shuffled, (n) => { return n !== locale })
  return [locale, shuffled[0]]
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
