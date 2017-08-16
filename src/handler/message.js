'use strict'

const ProfileHandler = require('./profile')
const Logger = require('../lib/logger')
const Localise = require('../locale/localise')
const Timer = require('../lib/timer')
const promise = require('../lib/async')
const translate = require('../lib/translator')
const mp = require('../lib/mixpanel')
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
  async handleMessage(payload, reply) {

    const timer = new Timer()
    timer.start()

    const { sender, message, postback } = payload

    // clear state if we need to
    state.flushIfSizeLimitExceeded()

    // we don't care about handling our own responses
    if (sender.id === config.fb_page_id)
      return

    // getProfile retrieves user data from state first if it exists, otherwise
    // performs an aysnc call to Facebook to get the users information
    const profile = await this.profileHandler.getProfile(sender)

    // cache the user for subsequent requests
    state.set(sender.id, profile)

    // create new localised translator
    // this is used for conversations between the bot and the user
    const t = new Localise(getLocale(profile))

    // retrieve the users context (their translation mode) from state if it
    // exists, otherwise perform a fetch from redis
    const response = await repo(sender.id).get()

    // check for all incoming request types from the user, theses can be one of:
    // 1) postbacks (menu option)
    // 2) quick replies (quick action buttons)
    // 3) messages (direct messaging)
    if (postback && postback.payload) {
      await this.handlePostBack(response.context, postback, profile, sender, reply, t)
    }
    else if (message && message.quick_reply && message.quick_reply.payload) {
      await this.handlePostBack(response.context, message.quick_reply, profile, sender, reply, t)
    }
    else if (_.includes(message.text.toLowerCase(), t.say('help')) && !response.context) {
      this.handleHelp(response.context, profile, sender, reply, t)
    }
    else if (message.text === _const.responseType.reset || message.text === _const.responseType.switch) {
      await this.handlePostBack(response.context, {payload: message.text}, profile, sender, reply, t)
    }
    else if (!response.context) {
      await this.handleNoContext(sender, profile, message, reply, t)
    }
    else if (isPossibleChangeCommand(message.text, t)) {
      // we have context and the user has sent a text message, before translation check if this is
      // a possible direct change command: {lang} to {lang}
      const context = getContextFromMessage(message.text, true, t)
      if (context.hasTwo && context.from !== context.to) {
        await this.handleSetContext(context.code, context.from, context.to, sender, null, reply, t)
      }
    } else {
      // we made it! translate the message
      await this.handleTranslation(response.context, sender, message, reply, t)
    }

    timer.stop()
    Logger.log('info', timer.report)
  }

  // handlePostBack
  async handlePostBack(context, postback, profile, sender, reply, t) {
    Logger.log('info', 'handlePostBack')
    if (postback.payload === _const.responseType.getStarted) {
      return await this.handleGetStarted(sender, profile, reply, t)
    }
    else if (postback.payload === _const.responseType.help) {
      return await this.handleHelp(context, profile, sender, reply, t)
    }
    else if (postback.payload === _const.responseType.reset) {
      return await this.handleReset(sender, reply, t)
    }
    else if (postback.payload === _const.responseType.switch) {
      return await this.handleSwitch(context, sender, reply, t)
    }
    else if (postback.payload === _const.responseType.list) {
      return await this.handleShowAllLanguages(sender, reply, t)
    }
    else if (postback.payload === _const.responseType.setDefault) {
      const newContext = getContextFromCode('es:en', t)
      return await this.handleSetContext(newContext.code, newContext.from, newContext.to, sender, null, reply, t)
    }
    else if (postback.payload === _const.responseType.wantSuggestions) {
      return await this.handleShowSuggestions(profile, reply, t)
    }
    else if (_.includes(postback.payload, _const.responseType.takeSuggestion)) {
      return await this.handleSetContextFromSuggestion(postback.payload, sender, profile, null, reply, t)
    }
  }

  // handleGetStarted
  async handleGetStarted(sender, profile, reply, t) {
    Logger.log('info', 'handleGetStarted')
    return promise((resolve, reject) => {
      const suggestion = getContextSuggestion(profile, t)
      reply({
        text: t.say('getting_started', profile && profile.first_name, suggestion[0], suggestion[1]),
      }, (err) => {
        if (err) reject(err)
        mp.setPerson(sender, profile)
        mp.track('I click to get started', sender)
        resolve()
      })
    })
  }

  // handleHelp
  async handleHelp(context, profile, sender, reply, t) {
    Logger.log('info', 'handleHelp')
    return promise((resolve, reject) => {
      const suggestion = getContextSuggestion(profile, t)
      let text = t.say('ask_for_help', suggestion[0], suggestion[1])
      let options = [{
        'type': 'postback',
        'title': t.say('show_all_languages'),
        'payload': _const.responseType.list
      }]

      if (context) {
        context = getContextFromCode(context, t)
        text = t.say('ask_for_help_with_context', context.from, context.to)
        options.unshift({
          'type': 'postback',
          'title': t.say('reset'),
          'payload': _const.responseType.reset
        }, {
          'type': 'postback',
          'title': t.say('lang_to_lang', context.to, context.from),
          'payload': _const.responseType.switch
        })
      } else if (getLocale(profile) === 'es') {
        // Spanish to English is the most common context for ES users
        // offer this as a preset if no context has been set
        options.push({
          'type': 'postback',
          'title': t.say('lang_to_lang', 'Español', 'Inglés'),
          'payload': _const.responseType.setDefault
        })
      }

      reply({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'button',
            'text': text,
            'buttons': options
          }
        }
      }, (err) => {
        if (err) reject(err)
        mp.track('I ask for help', sender)
        resolve()
      })
    })
  }

  // handleShowSuggestions
  async handleShowSuggestions(profile, reply, t) {
    Logger.log('info', 'handleShowSuggestions')
    return promise((resolve, reject) => {
      const response = {
        text: t.say('suggestions'),
        quick_replies: []
      }
      const langs = getPopularSuggestions(profile)
      langs.forEach((code) => {
        response.quick_replies.push({
          'content_type': 'text',
          'title': getLanguageName(code, t),
          'payload': `${_const.responseType.takeSuggestion}${code}`
        })
      })
      reply(response, (err) => {
        if (err) reject(err)
        resolve()
      })
    })
  }

  // handleShowAllLanguages
  // due to Facebook's payload size limit we need to chunk the list into seprate bits
  async handleShowAllLanguages(sender, reply, t) {
    Logger.log('info', 'handleShowAllLanguages')
    return promise((resolve) => {
      const list = getAllLanguageNames(t)
      const first = list.splice(0, list.length / 3)
      const second = list.splice(0, list.length / 2)
      reply({text: `${t.say('ok_here_goes')}\n\n${first.toString().replace(/,/g, ', ')}`}, () => {
        reply({text: `${second.toString().replace(/,/g, ', ')}`}, () => {
          reply({text: `${list.toString().replace(/,/g, ', ')}\n\n ${t.say('gasp')}`}, () => {
            resolve()
          })
        })
      })
    })
  }

  // handleReset
  async handleReset(sender, reply, t) {
    Logger.log('info', 'handleReset')
    return repo(sender.id).set('').then((err) => {
      if (err) Logger.log('error', err)
      reply({
        text: t.say('translate_next')
      }, (err) => {
        if (err) Logger.log('error', err)
        mp.track('I reset context', sender)
      })
    })
  }

  // handleSwitch
  async handleSwitch(context, sender, reply, t) {
    Logger.log('info', 'handleSwitch')
    context = switchContext(getContextFromCode(context, t))
    return await this.handleSetContext(context.code, context.from, context.to, sender, null, reply, t)
  }

  // handleNoContext
  async handleNoContext(sender, profile, message, reply, t) {
    Logger.log('info', 'handleNoContext')
    return promise((resolve, reject) => {
      const context = getContextFromMessage(message.text, false, t)
      if (context.hasTwo && context.from !== context.to) {
        return this.handleSetContext(context.code, context.from, context.to, sender, message, reply, t)
      }
      else if (this.handleGeneralResponse(sender, profile, message, reply, t) !== false) {
        resolve()
      } else {
        const response = {}
        response.text = context.hasOne ? t.say('part_unrecognised', context.from) : t.say('unreconised')
        response.quick_replies = [{
          'content_type': 'text',
          'title': t.say('need_help?'),
          'payload': '#help'
        }, {
          'content_type': 'text',
          'title': t.say('suggest_from', getLanguageNameLocale(profile, t)),
          'payload': _const.responseType.wantSuggestions
        }]
        reply(response, (err) => {
          if (err) reject(err)
          mp.track('I incorrectly set context', sender, message)
          resolve()
        })
      }
    })
  }

  // handleGeneralResponse such as hello, goodbye etc
  handleGeneralResponse(sender, profile, message, reply) {
    if (_.includes(['goodbye', 'bye', 'adios', 'ciao', 'seeya', 'see you', 'later'], message.text.toLowerCase())) {
      reply({
        text: `Adiós ${profile.gender === 'male' ? 'muchacho' : 'muchacha'}`
      }, () => {
        mp.track('I say goodbye without context', sender, message)
      })
    }
    if (_.includes(['hello', 'hi', 'howdy', 'hallo', 'yo', 'hey', 'sup', 'hiya', 'hola'], message.text.toLowerCase())) {
      reply({
        text: getRandom([`Hi ${profile.first_name}!`, 'Hello', '¡Hola!', `Hey ${profile.first_name}!`, 'Oh hey there!', 'Hallo', 'Howdy', 'Oh Hiiiiii'])
      }, () => {
        mp.track('I say hello without context', sender, message)
      })
    }
    if (_.includes(message.text.toLowerCase(), 'hmm')) {
      reply({ text: 'hmmmm...' })
    }
    return false
  }

  // handleSetContextFromSuggestion
  async handleSetContextFromSuggestion(payload, sender, profile, message, reply, t) {
    Logger.log('info', 'handleSetContextFromSuggestion')
    const from = getLocale(profile)
    const to = payload.split(':')[1]
    const code = `${from}:${to}`
    const context = getContextFromCode(code, t)
    return this.handleSetContext(code, context.from, context.to, sender, message, reply, t)
  }

  // handleSetContext
  async handleSetContext(code, from, to, sender, message, reply, t) {
    Logger.log('info', 'handleSetContext')
    return repo(sender.id).set(code).then((err) => {
      if (err) Logger.log('error', err)
      reply({
        text: t.say('set_context', from, to)
      }, (err) => {
        if (err) throw err
        mp.track('I set context', sender, message)
      })
    })
  }

  // handleTranslation
  async handleTranslation(context, sender, message, reply, t) {
    Logger.log('info', 'handleTranslation')
    let response = {}
    return translate(message.text, context).
      then((result) => {
        if (result.length > _const.maxTextReplyLength) {
          reply({text: t.say('too_long')})
        }
        response.text = result
        // check if the user actually wants help by passing a quick reply button with the translated text
        if (_.includes(message.text.toLowerCase(), t.say('help'))) {
          response.quick_replies = [{
            'content_type': 'text',
            'title': t.say('need_help?'),
            'payload': '#help'
          }]
        }
        reply(response, (err) => {
          if (err) Logger.log('error', err)
          mp.track('I send a message to be translated', sender, message)
        })
      }).
      catch((err) => {
        if (err) Logger.log('error', err)
        reply({ text: t.say('translation_error') })
      })
  }

  // _privates
  // expose these for tests
  _privates() {
    return {
      getContextFromMessage,
      getContextFromCode,
      switchContext,
      getLanguageName,
      getAllLanguageNames,
      getLocale,
      getLanguageNameLocale,
      getContextSuggestion,
      getPopularSuggestions,
      getRandom,
      isPossibleChangeCommand
    }
  }
}

// private methods
// getContextFromMessage
const getContextFromMessage = (message, strict, t) => {
  const ctxMatches = getContextMatches(message, strict, t)
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
const getContextFromCode = (code, t) => {
  const codes = code.split(':')
  return {
    code,
    from: getLanguageName(codes[0], t),
    to: getLanguageName(codes[1], t),
    hasTwo: true
  }
}

// getContextMatches
const getContextMatches = (message, strict, t) => {
  let matches = []
  const words = message.split(' ')
  if (!strict || (strict && words.length === 3)) {
    words.forEach((word) => {
      t.allLanguagesInAllLocales.filter(
        item => _.lowerCase(item.name) === _.lowerCase(word)
      ).map((lang) => {
        if (matches.length === 2) return
        // ensure the language name is displayed back to the user in their locale
        matches.push({ name: getLanguageName(lang.code, t), code: lang.code })
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
const switchContext = (context) => {
  const values = context.code.split(':')
  const from = context.to
  const to = context.from

  context.code = `${values[1]}:${values[0]}`
  context.from = from
  context.to = to

  return context
}

// getLanguageName
const getLanguageName = (code, t) => {
  const name = t.languages.filter(item => item.code === code).map((lang) => {
    return lang.name
  })
  if (name && name.length) return _.capitalize(name[0])
}

// listAllLanguages
const getAllLanguageNames = (t) => {
  let list = []
  t.languages.forEach((lang) => {
    list.push(_.capitalize(lang.name))
  })
  return _.sortBy(list)
}

// getLocale
const getLocale = (profile) => {
  if (!profile || (profile && !profile.locale || profile.locale.indexOf('_') === -1)) return
  return profile.locale.split('_')[0]
}

// getLanguageNameLocale
const getLanguageNameLocale = (profile, t) => {
  const code = getLocale(profile)
  return code && getLanguageName(code, t)
}

// getRandom
const getRandom = (responses) => {
  return responses[Math.floor(Math.random()*responses.length)]
}

// getContextSuggestion
const getContextSuggestion = (profile, t) => {
  const locale = getLocale(profile)
  const localeLanguageName = getLanguageName(locale, t)
  let shuffled = shuffleArray(_.clone(_const.languageExamples))
  if (!locale) {
    const splice = shuffled.splice(0, 2)
    return [getLanguageName(splice[0], t), getLanguageName(splice[1], t)]
  }

  shuffled = _.remove(shuffled, (n) => { return n !== localeLanguageName })
  return [localeLanguageName, getLanguageName(shuffled[0], t)]
}

// getPopularSuggestions
const getPopularSuggestions = (profile) => {
  const locale = getLocale(profile)
  const suggestions = _.clone(_const.popularLanguages)
  return suggestions.filter((lang) => lang !== locale)
}

// shuffleArray
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

// isPossibleChangeCommand
const isPossibleChangeCommand = (message, t) => {
  const words = message.split(' ')
  return words.length === 3 && words[1] === t.say('to')
}

module.exports = MessageHandler
