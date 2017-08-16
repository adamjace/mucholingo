'use strict'

const promisify = require('../promisify')

const translate = () => {
  return promisify((resolve) => {
    resolve(true)
  })
}

module.exports = translate
