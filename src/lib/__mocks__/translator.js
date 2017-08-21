'use strict'

const promise = require('../async')

const translate = () => {
  return promise((resolve) => {
    resolve('mocked translation')
  })
}

module.exports = translate
