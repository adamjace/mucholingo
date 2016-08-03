'use strict'

const Logger = require('../lib/logger')

class ErrorHandler {

  static handleError(err) {
    Logger.log(err.message)
  }

}

module.exports = ErrorHandler