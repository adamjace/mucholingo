'use strict'

const config = require('../config')
const googleTranslate = require('google-translate')(config.google_key)
const promise = require('../lib/async')

const translate = (message, context) => {
  const arr = context.split(':')
  const source = arr[0]
  const target = arr[1]
  return promise((resolve, reject) => {
    if (!googleTranslate || !googleTranslate.translate) reject(null)
    googleTranslate.translate(message, source, target, (err, translation) => {
      if (err) return reject(err)
      resolve(translation.translatedText)
    })
  })
}

module.exports = translate
