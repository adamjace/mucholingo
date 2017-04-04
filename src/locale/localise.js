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

    this.code = code
    this.map = require(util.format('./%s.js', this.code))
    this.langs = require(util.format('./lang/%s.js', this.code))
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
