const config = require('../config')
const googleTranslate = require('google-translate')(config.google_key)
const Promise = require('bluebird')

class Translator {
  
  static translate(message, context) {
    const arr = context.split(':')
    const source = arr[0]
    const target = arr[1]
    return new Promise((resolve, reject) => {
      googleTranslate.translate(message, source, target, (err, translation) => {
        if (err) return reject(err)
        resolve(translation.translatedText)
      })
    })
  }
}

module.exports = Translator