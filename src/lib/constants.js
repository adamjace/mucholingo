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
  'English', 'German', 'Italian', 'Korean', 'Dutch', 'Japanese', 'Hindi',
  'Spanish', 'French', 'Indonesian', 'Russian', 'Chinese', 'Greek'
]

module.exports = {
  maxTextReplyLength: maxTextReplyLength,
  lostInTranslation: lostInTranslation,
  responseType: responseType,
  languageExamples: languageExamples
}
