'use strict'

const maxTextReplyLength = 320
const lostInTranslation = 'Lost in translation'

const responseType = {
  help: '#help',
  getStarted: '#getstarted',
  reset: '#reset',
  switch: '#switch',
  list: '#list',
  setDefault: '#setdefault',
  wantSuggestions: '#wantsuggestions',
  takeSuggestion: '#suggestion:'
}

const languageExamples = [
  'en', 'de', 'it', 'ko', 'nl', 'ja', 'ar',
  'es', 'fr', 'id', 'ru', 'zh-CN', 'el'
]

const popularLanguages = ['es', 'en', 'fr', 'ja', 'de', 'ar']

module.exports = {
  maxTextReplyLength,
  lostInTranslation,
  responseType,
  languageExamples,
  popularLanguages
}
