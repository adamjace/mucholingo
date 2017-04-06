const util = require('util')
const _const = require('../lib/constants')
const _ = require('lodash')

const supportedLanguages = ['en', 'es']
const defaultIfNotSupported = 'en'
const getLocaleFile = (code) => require(util.format('./%s.js', code))
const getLanguageFile = (code) => require(util.format('./lang/%s.js', code))

// used for non locale specific smart language detection
let allLanguagesInAllLocales = []
supportedLanguages.forEach((code) => {
  allLanguagesInAllLocales = [
    ...allLanguagesInAllLocales,
    ...getLanguageFile(code)
  ]
})

class Localise {

  constructor(code) {
    if (!_.includes(supportedLanguages, code)) {
      code = defaultIfNotSupported
    }

    this.code = code
    this.map = getLocaleFile(this.code)
    this.langs = getLanguageFile(this.code)
  }

  get allLanguagesInAllLocales() {
    return allLanguagesInAllLocales
  }

  get languages() {
    return this.langs
  }

  get locale() {
    return this.code
  }

  say(key, ...args) {
    if (!this.map[key]) {
      return _const.lostInTranslation
    }
    return util.format(this.map[key], ...args)
  }
}

module.exports = Localise
