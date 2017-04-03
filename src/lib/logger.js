'use strict'

class Logger {
  static log(type, message) {
    console.log(`${type}: ${message}`)
  }
}

module.exports = Logger
