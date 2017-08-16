'use strict'

const promise = require('../async')

const translate = () => {
  return promise((resolve) => {
    resolve(true)
  })
}

module.exports = translate
