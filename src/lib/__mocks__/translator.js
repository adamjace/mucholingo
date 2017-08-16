'use strict'

const async = require('../async')

const translate = () => {
  return promise((resolve) => {
    resolve(true)
  })
}

module.exports = translate
