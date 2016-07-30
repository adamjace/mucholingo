const Logger = require('../lib/logger')

const errorHandler = (err) => {
  Logger.log(err.message)
}

module.exports = errorHandler