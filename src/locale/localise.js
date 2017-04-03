const util = require('util')
const _const = require('../lib/constants')
const _ = require('lodash')

const supportedLanguages = ['en', 'es']
const defaultIfNotSupported = 'en'

class Localise {

  constructor(code) {
    if (!_.includes(supportedLanguages, code)) {
      code = defaultIfNotSupported
    }

    this.code = require(util.format('./%s.js', code))
    this._languages = require(util.format('./lang/%s.js', code))
  }

  get languages() {
    return this._languages
  }

  say(key, ...args) {
    if (!this.code[key]) {
      return _const.lostInTranslation
    }
    return util.format(this.code[key], ...args)
  }
}

module.exports = Localise
