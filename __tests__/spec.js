'use strict'

const _ = require('lodash')
const languages = require('../src/lib/lang')
const repo = require('../src/db/repo')
const db = require('../src/db/redis')
const state = require('../src/lib/state')
const _const = require('../src/lib/constants')
const _MessageHandler = require('../src/handler/message')
const Localise = require('../src/locale/localise')

let lastReply = '';
const userId = 'testUserId'

const reply = ({text}) => {
  lastReply = text
}

const profile = {
  first_name: 'Jon',
  last_name: 'Doe',
  locale: 'es_AU'
}

const bot = {
  setTyping: () => {},
  getProfile: function(id, cb) {
    cb(null, profile)
  }
}

const MessageHandler = new _MessageHandler(bot)
const privates = MessageHandler._privates()

describe('Bot tests', function() {

  beforeEach(() => {
    db.__setContext(undefined)
    state.clear()
    delete profile.context
  })

  describe('State test', function() {
    it('should set state correctly', function() {
      expect(state.get(userId)).toEqual(undefined)
      state.set(userId, 'test')
      expect(state.get(userId)).toEqual('test')
    })

    it('should set and clear state correctly', function() {
      state.set('user1', 'apples')
      state.set('user2', 'pears')
      state.set('user3', 'strawberries')
      state.set('user4', 'bananas')

      expect(state.size()).toEqual(4)
      state.flushIfSizeLimitExceeded()
      expect(state.size()).toEqual(4)
      state.clear()
      expect(state.size()).toEqual(0)

      for (let i = 1; i < 1002; i++) {
        state.set(`user_${i}`, i)
      }

      expect(state.size()).toEqual(1001)
      state.flushIfSizeLimitExceeded()
      expect(state.size()).toEqual(0)
    })
  })

  describe('DB client test', function() {
    it('should set and get context from the db', function(done) {
      const testValue = 'test_value'
      repo(userId).set(testValue).then(() => {
        repo(userId).get().then((response) => {
          expect(response.context).toEqual(testValue)
          done()
        })
      })
    })
  })

  describe('DB/State integration test', function() {
    let profile = {}
    beforeEach(() => { profile = {} })
    it('should retrieve data from state', function(done) {
      profile.context = 'test_value'
      state.set(userId, profile)
      repo(userId).get().then((response) => {
        expect(response.context).toEqual('test_value')
        expect(response.source).toEqual('state')
        done()
      })
    })

    it('should retrieve data from the DB', function(done) {
      db.__setContext('test_value')
      repo(userId).get().then((response) => {
        expect(response.context).toEqual('test_value')
        expect(response.source).toEqual('redis')
        done()
      })
    })
  })

  describe('Message handlers', function() {
    let payload;
    beforeEach(() => {
      payload = {
        sender: { id: 'senderId' },
        message: { text: ''},
        postback: null
      }
    })

    it('should call handleHelp if no context is set', function(done) {
      db.__setContext(undefined)
      payload.message.text = 'help'
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should NOT call handleHelp if context is set', function(done) {
      db.__setContext(true)
      payload.message.text = 'help'
      payload.sender.id = userId
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleHelp).not.toHaveBeenCalled()
        done()
      })
    })

    it('should call handleTranslation if context is set', function(done) {
      db.__setContext(true)
      payload.message.text = 'test message'
      payload.sender.id = userId
      spyOn(MessageHandler, 'handleTranslation')
      spyOn(MessageHandler, 'handleNoContext')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleTranslation).toHaveBeenCalled()
        expect(MessageHandler.handleNoContext).not.toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should NOT call handleTranslation if no context is set', function(done) {
      db.__setContext(undefined)
      payload.sender.id = userId
      payload.message.text = 'test message'
      spyOn(MessageHandler, 'handleTranslation')
      spyOn(MessageHandler, 'handleNoContext')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleTranslation).not.toHaveBeenCalled()
        expect(MessageHandler.handleNoContext).toHaveBeenCalled()
        done()
      })
    })

    it('should call handleSetContext', function(done) {
      payload.message.text = 'english to spanish'
      spyOn(MessageHandler, 'handleSetContext')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleSetContext).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should NOT call handleSetContext', function(done) {
      payload.message.text = 'english to blah'
      spyOn(MessageHandler, 'handleSetContext')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleSetContext).not.toHaveBeenCalled()
        done()
      })
    })

    it('should call handleSetContext from a change command', function(done) {
      payload.message.text = 'french to dutch'
      payload.sender.id = userId
      spyOn(MessageHandler, 'handleSetContext')
      spyOn(MessageHandler, 'handleTranslation')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleTranslation).not.toHaveBeenCalled()
        expect(MessageHandler.handleSetContext).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })
  })

  describe('Postback handlers', function() {
    let payload;
    beforeEach(() => {
      payload = {
        sender: { id: 1 },
        message : {},
        postback: {
          payload: null
        }
      }
    })

    it('should call handleGetStarted postback', function(done) {
      payload.postback.payload = '#getstarted'
      const reply = {}
      spyOn(MessageHandler, 'handleGetStarted')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleGetStarted).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleHelp postback', function(done) {
      payload.postback.payload = '#help'
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleReset postback', function(done) {
      payload.postback.payload = '#reset'
      spyOn(MessageHandler, 'handleReset')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleReset).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleSwitch postback', function(done) {
      payload.postback.payload = '#switch'
      spyOn(MessageHandler, 'handleSwitch')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleSwitch).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleShowAllLanguages postback', function(done) {
      payload.postback.payload = '#list'
      spyOn(MessageHandler, 'handleShowAllLanguages')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleShowAllLanguages).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleHelp quick reply postback', function(done) {
      payload.postback = null
      payload.message = {quick_reply:{payload: '#help'}}
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })
  })

  describe('test private methods', function() {

    it('should get context from message without strict matching', function() {
      let context = privates.getContextFromMessage('translate from english to spanish please')
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('English')
      expect(context.to).toEqual('Spanish')
      expect(context.hasTwo).toEqual(true)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(false)
    })

    it('should get context from message with strict matching', function() {
      let context = privates.getContextFromMessage('english to spanish', true)
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('English')
      expect(context.to).toEqual('Spanish')
      expect(context.hasTwo).toEqual(true)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(false)
    })

    it('should NOT get context from message with strict matching', function() {
      let context = privates.getContextFromMessage('translate from english to spanish please', true)
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual(undefined)
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(true)
    })

    it('should part get context from message', function() {
      let context = privates.getContextFromMessage('french to blahh')
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual('French')
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(true)
      expect(context.hasNone).toEqual(false)
    })

    it('should NOT get context from message', function() {
      let context = privates.getContextFromMessage('ping to pong')
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual(undefined)
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(true)
    })

    it('should get context from code', function() {
      let context = privates.getContextFromCode('fr:de')
      expect(context.code).toEqual('fr:de')
      expect(context.from).toEqual('French')
      expect(context.to).toEqual('German')
      expect(context.hasTwo).toEqual(true)
    })

    it('should switch context', function() {
      const context = { code: 'en:ru', from: 'English', to: 'Russian' }
      const switched = privates.switchContext(context)
      expect(context.code).toEqual('ru:en')
      expect(context.from).toEqual('Russian')
      expect(context.to).toEqual('English')
    })

    it('should get language name', function() {
      expect(privates.getLanguageName('en')).toEqual('English')
      expect(privates.getLanguageName('es')).toEqual('Spanish')
      expect(privates.getLanguageName('el')).toEqual('Greek')
      expect(privates.getLanguageName('zh-CN')).toEqual('Chinese')
    })

    it('should get language name from locale', function() {
      expect(privates.getLanguageNameLocale({locale: 'en_AU'})).toEqual('English')
      expect(privates.getLanguageNameLocale({locale: 'en_GB'})).toEqual('English')
      expect(privates.getLanguageNameLocale({locale: 'es_ES'})).toEqual('Spanish')
      expect(privates.getLanguageNameLocale({locale: 'de_DE'})).toEqual('German')
      expect(privates.getLanguageNameLocale({locale: 'cs_CZ'})).toEqual('Czech')
      expect(privates.getLanguageNameLocale({locale: 'nothing'})).toEqual(undefined)
      expect(privates.getLanguageNameLocale({})).toEqual(undefined)
      expect(privates.getLanguageNameLocale(null)).toEqual(undefined)
    })

    it('should test that smart example is never undefined', function() {
      expect(privates.getContextSuggestion({locale: 'en_AU'})).not.toContain('undefined')
      expect(privates.getContextSuggestion({locale: 'en+test'})).not.toContain('undefined')
      expect(privates.getContextSuggestion({locale: ''})).not.toContain('undefined')
      expect(privates.getContextSuggestion({})).not.toContain('undefined')
      expect(privates.getContextSuggestion()).not.toContain('undefined')
    })

    it('should get all language names', function() {
      expect(privates.getAllLanguageNames().length).toEqual(91)
    })

    it('should detect possible change commands', function() {
      const t = new Localise(privates.getLocale(profile))
      expect(privates.isPossibleChangeCommand('english to spanish', t)).toEqual(true)
      expect(privates.isPossibleChangeCommand('a to b', t)).toEqual(true)
      expect(privates.isPossibleChangeCommand('english dutch', t)).toEqual(false)
      expect(privates.isPossibleChangeCommand('english romanian spanish', t)).toEqual(false)
      expect(privates.isPossibleChangeCommand('english to', t)).toEqual(false)
      expect(privates.isPossibleChangeCommand('blah_to_blah', t)).toEqual(false)
    })
  })
})
