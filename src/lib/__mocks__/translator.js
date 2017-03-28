'use strict'

const Promise = require('bluebird')

class Translator {

  static translate() {

    return new Promise((resolve) => {
      resolve(true)
    })
  }
}

module.exports = Translator
