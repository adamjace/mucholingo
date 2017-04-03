'use strict'

const maxTextReplyLength = 320
const lostInTranslation = 'Lost in translation'

const responseType = {
  help: '#help',
  getStarted: '#getstarted',
  reset: '#reset',
  switch: '#switch',
  list: '#list'
}

const languageExamples = [
  'en', 'de', 'it', 'ko', 'nl', 'jp', 'hi',
  'es', 'fr', 'id', 'ru', 'zh-CN', 'el'
]

module.exports = {
  maxTextReplyLength: maxTextReplyLength,
  lostInTranslation: lostInTranslation,
  responseType: responseType,
  languageExamples: languageExamples
}
