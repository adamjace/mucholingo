'use strict'

const maxTextReplyLength = 320

const responseType = {
  help: '#help',
  getStarted: '#getstarted',
  reset: '#reset',
  switch: '#switch',
  list: '#list'
}

const baseHelpOptions = [{
  'type': 'postback',
  'title': 'Show all languages',
  'payload': responseType.list
}]

const helpQuickReply = {
  'content_type': 'text',
  'title': 'Need help?',
  'payload': '#help'
}

const languageExamples = [
  'English', 'German', 'Italian', 'Korean', 'Dutch', 'Japanese', 'Hindi',
  'Spanish', 'French', 'Indonesian', 'Russian', 'Chinese', 'Greek'
]

module.exports = {
  maxTextReplyLength: maxTextReplyLength,
  responseType: responseType,
  baseHelpOptions: baseHelpOptions,
  helpQuickReply: helpQuickReply,
  languageExamples: languageExamples
}
