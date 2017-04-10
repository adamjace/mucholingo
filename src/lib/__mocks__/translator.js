'use strict'

const async = require('../async')

const translate = () => {
  return async((resolve) => {
    resolve(true)
  })
}

module.exports = translate
