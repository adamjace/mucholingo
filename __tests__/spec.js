'use strict'

jest.unmock('redis')
jest.unmock('bluebird')
jest.unmock('sshpk')
jest.unmock('lodash')
jest.unmock('../src/db/redis')
jest.unmock('../src/handler/message')
jest.unmock('../src/lib/translator')
jest.unmock('../src/lib/lang')

const _ = require('lodash')
const languages = require('../src/lib/lang')
const db = require('../src/db/redis')
const MessageHandler = require('../src/handler/message')
const privates = MessageHandler._privates()

const userId = 'testUserId'
const reply = jest.fn()

const profile = {
  first_name: 'Jon',
  last_name: 'Doe',
  locale: 'en_AU'
}

const bot = {
  setTyping: () => {},
  getProfile: function(id, cb) {
    cb(null, profile)
  }
}

describe('Bot tests', function() {

  describe('DB integration test', function() {
    it('should set and get context from the db', function(done) {
      const testValue = 'test_value'
      db.setAsync(userId, testValue).then((context) => {
        db.getAsync(userId).then((context) => {
          expect(context).toEqual(testValue)
          done()
        })
      });
    });
  });

  describe('Message handlers', function() {
    let payload;
    beforeEach(() => {
      payload = {
        sender: { id: 1 },
        message: { text: ''},
        postback: null
      }
    })

    it('should call handleHelp if no context is set', function(done) {
      payload.message.text = 'help'
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
        done()
      })
    });

    it('should NOT call handleHelp if context is set', function(done) {
      payload.message.text = 'help'
      payload.sender.id = userId
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleHelp).not.toHaveBeenCalled()
        done()
      })
    });

    it('should call handleTranslation if context is set', function(done) {
      payload.message.text = 'test message'
      payload.sender.id = userId
      spyOn(MessageHandler, 'handleTranslation')
      spyOn(MessageHandler, 'handleNoContext')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleTranslation).toHaveBeenCalled()
        expect(MessageHandler.handleNoContext).not.toHaveBeenCalled()
        done()
      })
    });

    it('should NOT call handleTranslation if no context is set', function(done) {
      payload.message.text = 'test message'
      spyOn(MessageHandler, 'handleTranslation')
      spyOn(MessageHandler, 'handleNoContext')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleTranslation).not.toHaveBeenCalled()
        expect(MessageHandler.handleNoContext).toHaveBeenCalled()
        done()
      })
    });

    it('should call handleSetContext', function(done) {
      payload.message.text = 'english to spanish'
      spyOn(MessageHandler, 'handleSetContext')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleSetContext).toHaveBeenCalled()
        done()
      })
    });

    it('should NOT call handleSetContext', function(done) {
      payload.message.text = 'english to blah'
      spyOn(MessageHandler, 'handleSetContext')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleSetContext).not.toHaveBeenCalled()
        done()
      })
    });

    it('should call handleSetContext from a change command', function(done) {
      payload.message.text = 'french to dutch'
      payload.sender.id = userId
      spyOn(MessageHandler, 'handleSetContext')
      spyOn(MessageHandler, 'handleTranslation')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleTranslation).not.toHaveBeenCalled()
        expect(MessageHandler.handleSetContext).toHaveBeenCalled()
        done()
      })
    });

  });

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
      spyOn(MessageHandler, 'handleGetStarted')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleGetStarted).toHaveBeenCalled()
        done()
      })
    });

    it('should call handleHelp postback', function(done) {
      payload.postback.payload = '#help'
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
        done()
      })
    });

    it('should call handleReset postback', function(done) {
      payload.postback.payload = '#reset'
      spyOn(MessageHandler, 'handleReset')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleReset).toHaveBeenCalled()
        done()
      })
    });

    it('should call handleSwitch postback', function(done) {
      payload.postback.payload = '#switch'
      spyOn(MessageHandler, 'handleSwitch')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleSwitch).toHaveBeenCalled()
        done()
      })
    });

    it('should call handleShowAllLanguages postback', function(done) {
      payload.postback.payload = '#list'
      spyOn(MessageHandler, 'handleShowAllLanguages')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleShowAllLanguages).toHaveBeenCalled()
        done()
      })
    })

    it('should call handleHelp quick reply postback', function(done) {
      payload.postback = null
      payload.message = {quick_reply:{payload: '#help'}}
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(bot, payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
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
    });

    it('should get context from message with strict matching', function() {
      let context = privates.getContextFromMessage('english to spanish', true)
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('English')
      expect(context.to).toEqual('Spanish')
      expect(context.hasTwo).toEqual(true)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(false)
    });

    it('should NOT get context from message with strict matching', function() {
      let context = privates.getContextFromMessage('translate from english to spanish please', true)
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual(undefined)
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(true)
    });

    it('should part get context from message', function() {
      let context = privates.getContextFromMessage('french to blahh')
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual('French')
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(true)
      expect(context.hasNone).toEqual(false)
    });

    it('should NOT get context from message', function() {
      let context = privates.getContextFromMessage('ping to pong')
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual(undefined)
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(true)
    });

    it('should get context from code', function() {
      let context = privates.getContextFromCode('fr:de')
      expect(context.code).toEqual('fr:de')
      expect(context.from).toEqual('French')
      expect(context.to).toEqual('German')
      expect(context.hasTwo).toEqual(true)
    });

    it('should switch context', function() {
      const context = { code: 'en:ru', from: 'English', to: 'Russian' }
      const switched = privates.switchContext(context)
      expect(context.code).toEqual('ru:en')
      expect(context.from).toEqual('Russian')
      expect(context.to).toEqual('English')
    });

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
    })
  })
})
