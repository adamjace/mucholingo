'use strict'

const Promise = require('bluebird')

class Translator {

  static translate() {

    return new Promise((resolve, reject) => {
      resolve(true)
    })
  }
}

module.exports = Translator
