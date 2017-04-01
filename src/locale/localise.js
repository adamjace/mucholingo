const util = require('util')
const _const = require('../lib/constants')
const _ = require('lodash')

const path = './%s.js'
const supported = ['en', 'es']
const fallback = 'en'

class Localise {

  constructor(locale) {
    if (!_.includes(supported, locale)) {
      locale = fallback
    }
    this.locale = require(util.format(path, locale))
  }

  say(key, ...args) {
    if (!this.locale[key]) {
      return _const.lostInTranslation
    }
    return util.format(this.locale[key], ...args)
  }
}

module.exports = Localise
