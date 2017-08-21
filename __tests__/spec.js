'use strict'

const _ = require('lodash')
const repo = require('../src/db/repo')
const db = require('../src/db/redis')
const state = require('../src/lib/state')
const _const = require('../src/lib/constants')
const _MessageHandler = require('../src/handler/message')
const _ProfileHandler = require('../src/handler/profile')
const Localise = require('../src/locale/localise')

let lastReply = ''
let quickReplies = []

const userId = 'testUserId'

const reply = (payload, cb) => {
  lastReply = payload.text
  quickReplies = payload.quick_replies
  cb && cb()
}

const profile = {
  first_name: 'Jon',
  last_name: 'Doe',
  locale: 'en_AU'
}

const bot = {
  setTyping: () => {},
  getProfile: (id, cb) => {
    cb(null, profile)
  }
}

const MessageHandler = new _MessageHandler(bot)
const ProfileHandler = new _ProfileHandler(bot)
const privates = MessageHandler._privates()
const t = new Localise(privates.getLocale(profile))

describe('Bot tests', () => {

  beforeEach(() => {
    db.__setContext(undefined)
    state.clear()
    delete profile.context
  })

  describe('State test', () => {
    it('should set state correctly', () => {
      expect(state.get(userId)).toEqual(undefined)
      state.set(userId, 'test')
      expect(state.get(userId)).toEqual('test')
    })

    it('should set and clear state correctly', () => {
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

    it('should get userProfile data from state', () => {
      const id = 123;
      state.set(id, { id, first_name: 'Harry', last_name: 'Highpants', locale: 'en_AU' })
      ProfileHandler.getProfile({ id }, (err, profile) => {
        expect(profile.id).toEqual(123)
      })
    })
  })

  describe('DB client test', () => {
    it('should set and get context from the db', (done) => {
      const testValue = 'test_value'
      repo(userId).set(testValue).then(() => {
        repo(userId).get().then((response) => {
          expect(response.context).toEqual(testValue)
          done()
        })
      })
    })
  })

  describe('DB/State integration test', () => {
    let profile = {}
    beforeEach(() => { profile = {} })
    it('should retrieve data from state', (done) => {
      profile.context = 'test_value'
      state.set(userId, profile)
      repo(userId).get().then((response) => {
        expect(response.context).toEqual('test_value')
        expect(response.source).toEqual('state')
        done()
      })
    })

    it('should retrieve data from the DB', (done) => {
      db.__setContext('test_value')
      repo(userId).get().then((response) => {
        expect(response.context).toEqual('test_value')
        expect(response.source).toEqual('redis')
        done()
      })
    })
  })

  describe('Message handlers', () => {
    let payload;
    beforeEach(() => {
      payload = {
        sender: { id: 'senderId' },
        message: { text: ''},
        postback: null
      }
    })

    it('should call handleHelp if no context is set', (done) => {
      db.__setContext(undefined)
      payload.message.text = 'help'
      spyOn(MessageHandler, 'handleHelp')
      expect(MessageHandler.handleHelp).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should NOT call handleHelp if context is set', (done) => {
      db.__setContext(true)
      payload.message.text = 'help'
      payload.sender.id = userId
      spyOn(MessageHandler, 'handleHelp')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleHelp).not.toHaveBeenCalled()
        done()
      })
    })

    describe('handleTranslation', () => {
      it('should be called with no quick replies', (done) => {
        db.__setContext(true)
        payload.message.text = 'test message'
        payload.sender.id = userId
        spyOn(MessageHandler, 'handleTranslation')
        spyOn(MessageHandler, 'handleNoContext')
        expect(MessageHandler.handleTranslation).not.toHaveBeenCalled()
        MessageHandler.handleMessage(payload, reply).then(() => {
          expect(MessageHandler.handleTranslation).toHaveBeenCalled()
          expect(MessageHandler.handleNoContext).not.toHaveBeenCalled()
          expect(lastReply).toEqual('mocked translation')
          done()
        })
      })

      it('should be called with 1 quick reply (help)', (done) => {
        db.__setContext(true)
        payload.message.text = 'test message help'
        payload.sender.id = userId
        spyOn(MessageHandler, 'handleTranslation')
        spyOn(MessageHandler, 'handleNoContext')
        expect(MessageHandler.handleTranslation).not.toHaveBeenCalled()
        MessageHandler.handleMessage(payload, reply).then(() => {
          expect(MessageHandler.handleTranslation).toHaveBeenCalled()
          expect(MessageHandler.handleNoContext).not.toHaveBeenCalled()
          expect(lastReply).toEqual('mocked translation')
          expect(quickReplies.length).toBe(1)
          done()
        })
      })

      it('should be called with 1 quick reply (change cmd)', (done) => {
        db.__setContext(true)
        payload.message.text = 'test message english something else and spanish'
        payload.sender.id = userId
        spyOn(MessageHandler, 'handleTranslation')
        spyOn(MessageHandler, 'handleNoContext')
        MessageHandler.handleMessage(payload, reply).then(() => {
          expect(MessageHandler.handleTranslation).toHaveBeenCalled()
          expect(MessageHandler.handleNoContext).not.toHaveBeenCalled()
          expect(lastReply).toEqual('mocked translation')
          expect(quickReplies.length).toBe(1)
          done()
        })
      })

      it('should NOT call be called if no context is set', (done) => {
        db.__setContext(undefined)
        payload.sender.id = userId
        payload.message.text = 'test message'
        spyOn(MessageHandler, 'handleTranslation')
        spyOn(MessageHandler, 'handleNoContext')
        expect(MessageHandler.handleNoContext).not.toHaveBeenCalled()
        MessageHandler.handleMessage(payload, reply).then(() => {
          expect(MessageHandler.handleTranslation).not.toHaveBeenCalled()
          expect(MessageHandler.handleNoContext).toHaveBeenCalled()
          done()
        })
      })
    })

    it('should call handleSetContext', (done) => {
      payload.message.text = 'english to spanish'
      spyOn(MessageHandler, 'handleSetContext')
      expect(MessageHandler.handleSetContext).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleSetContext).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should NOT call handleSetContext', (done) => {
      payload.message.text = 'english to blah'
      spyOn(MessageHandler, 'handleSetContext')
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleSetContext).not.toHaveBeenCalled()
        done()
      })
    })

    it('should call handleSetContext from a change command', (done) => {
      payload.message.text = 'french to dutch'
      payload.sender.id = userId
      spyOn(MessageHandler, 'handleSetContext')
      spyOn(MessageHandler, 'handleTranslation')
      expect(MessageHandler.handleSetContext).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleTranslation).not.toHaveBeenCalled()
        expect(MessageHandler.handleSetContext).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })
  })

  describe('Postback handlers', () => {
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

    it('should call handleGetStarted postback', (done) => {
      payload.postback.payload = _const.responseType.getStarted
      const reply = {}
      spyOn(MessageHandler, 'handleGetStarted')
      expect(MessageHandler.handleGetStarted).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleGetStarted).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleHelp postback', (done) => {
      payload.postback.payload = _const.responseType.help
      spyOn(MessageHandler, 'handleHelp')
        expect(MessageHandler.handleHelp).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleReset postback', (done) => {
      payload.postback.payload = _const.responseType.reset
      spyOn(MessageHandler, 'handleReset')
      expect(MessageHandler.handleReset).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleReset).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleSwitch postback', (done) => {
      payload.postback.payload = _const.responseType.switch
      spyOn(MessageHandler, 'handleSwitch')
      expect(MessageHandler.handleSwitch).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleSwitch).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleShowAllLanguages postback', (done) => {
      payload.postback.payload = _const.responseType.list
      spyOn(MessageHandler, 'handleShowAllLanguages')
      expect(MessageHandler.handleShowAllLanguages).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleShowAllLanguages).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleHelp quick reply postback', (done) => {
      payload.postback = null
      payload.message = {quick_reply:{payload: _const.responseType.help}}
      spyOn(MessageHandler, 'handleHelp')
      expect(MessageHandler.handleHelp).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleHelp).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleSetContext postback', (done) => {
      payload.postback.payload = _const.responseType.setDefault
      const reply = {}
      spyOn(MessageHandler, 'handleSetContext')
      expect(MessageHandler.handleSetContext).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleSetContext).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleShowSuggestions postback', (done) => {
      payload.postback.payload = _const.responseType.wantSuggestions
      const reply = {}
      spyOn(MessageHandler, 'handleShowSuggestions')
      expect(MessageHandler.handleShowSuggestions).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleShowSuggestions).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })

    it('should call handleSetContextFromSuggestion postback', (done) => {
      payload.postback.payload = `${_const.responseType.takeSuggestion}es`
      const reply = {}
      spyOn(MessageHandler, 'handleSetContextFromSuggestion')
      expect(MessageHandler.handleSetContextFromSuggestion).not.toHaveBeenCalled()
      MessageHandler.handleMessage(payload, reply).then(() => {
        expect(MessageHandler.handleSetContextFromSuggestion).toHaveBeenCalled()
        expect(lastReply).not.toEqual(_const.lostInTranslation)
        done()
      })
    })
  })

  describe('test private methods', () => {

    it('should get context from message without strict matching', () => {
      let context = privates.getContextFromMessage('translate from english to spanish please', false, t)
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('English')
      expect(context.to).toEqual('Spanish')
      expect(context.hasTwo).toEqual(true)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(false)
    })

    it('should get context from message with strict matching', () => {
      let context = privates.getContextFromMessage('english to spanish', true, t)
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('English')
      expect(context.to).toEqual('Spanish')
      expect(context.hasTwo).toEqual(true)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(false)
    })

    it('should NOT get context from message with strict matching', () => {
      let context = privates.getContextFromMessage('translate from english to spanish please', true, t)
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual(undefined)
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(true)
    })

    it('should get context from message with strict matching and mixed languges', () => {
      let context = privates.getContextFromMessage('english to español', true, t)
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('English')
      expect(context.to).toEqual('Spanish')

      context = privates.getContextFromMessage('inglés to zulu', true, t)
      expect(context.code).toEqual('en:zu')
      expect(context.from).toEqual('English')
      expect(context.to).toEqual('Zulu')
    })

    it('should part get context from message', () => {
      let context = privates.getContextFromMessage('french to blahh', false, t)
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual('French')
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(true)
      expect(context.hasNone).toEqual(false)
    })

    it('should NOT get context from message', () => {
      let context = privates.getContextFromMessage('ping to pong', false, t)
      expect(context.code).toEqual(undefined)
      expect(context.from).toEqual(undefined)
      expect(context.to).toEqual(undefined)
      expect(context.hasTwo).toEqual(false)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(true)
    })

    it('should get context from code', () => {
      let context = privates.getContextFromCode('fr:de', t)
      expect(context.code).toEqual('fr:de')
      expect(context.from).toEqual('French')
      expect(context.to).toEqual('German')
      expect(context.hasTwo).toEqual(true)
    })

    it('should switch context', () => {
      const context = { code: 'en:ru', from: 'English', to: 'Russian' }
      const switched = privates.switchContext(context)
      expect(context.code).toEqual('ru:en')
      expect(context.from).toEqual('Russian')
      expect(context.to).toEqual('English')
    })

    it('should get language name', () => {
      expect(privates.getLanguageName('en', t)).toEqual('English')
      expect(privates.getLanguageName('es', t)).toEqual('Spanish')
      expect(privates.getLanguageName('el', t)).toEqual('Greek')
      expect(privates.getLanguageName('zh-CN', t)).toEqual('Chinese')
    })

    it('should get language name from locale', () => {
      expect(privates.getLanguageNameLocale({locale: 'en_AU'}, t)).toEqual('English')
      expect(privates.getLanguageNameLocale({locale: 'en_GB'}, t)).toEqual('English')
      expect(privates.getLanguageNameLocale({locale: 'es_ES'}, t)).toEqual('Spanish')
      expect(privates.getLanguageNameLocale({locale: 'de_DE'}, t)).toEqual('German')
      expect(privates.getLanguageNameLocale({locale: 'cs_CZ'}, t)).toEqual('Czech')
      expect(privates.getLanguageNameLocale({locale: 'nothing'}, t)).toEqual(undefined)
      expect(privates.getLanguageNameLocale({}, t)).toEqual(undefined)
      expect(privates.getLanguageNameLocale(null, t)).toEqual(undefined)
    })

    it('should test that smart example is never undefined', () => {
      expect(privates.getContextSuggestion({locale: 'en_AU'}, t)[0]).toEqual('English')
      expect(privates.getContextSuggestion({locale: 'en_AU'}, t)).not.toContain('undefined')
      expect(privates.getContextSuggestion({locale: 'en+test'}, t)).not.toContain('undefined')
      expect(privates.getContextSuggestion({locale: ''}, t)).not.toContain('undefined')
      expect(privates.getContextSuggestion({}, t)).not.toContain('undefined')
      expect(privates.getContextSuggestion(undefined, t)).not.toContain('undefined')
    })

    it('should get all language names', () => {
      expect(privates.getAllLanguageNames(t).length).toEqual(91)
    })

    it('should test getRandom returns a single response', () => {
      expect([privates.getRandom([1,2,3,4,5,6,7,8,9,0])].length).toEqual(1)
    })

    it('should default to EN if locale is not supported', () => {
      const t = new Localise('it')
      expect(t.locale).toEqual('en')
    })

    describe('Test change commands', () => {
      it('should detect a direct change command', () => {
        const changeCmd = privates.parseChangeCmd('english to spanish', t)
        expect(changeCmd.isDirectCmd).toEqual(true)
        expect(changeCmd.hasTwo).toEqual(true)
      })

      it('should detect a possible change command', () => {
        const changeCmd = privates.parseChangeCmd('english something spanish', t)
        expect(changeCmd.isDirectCmd).toEqual(false)
        expect(changeCmd.hasTwo).toEqual(true)
      })

      it('should NOT detect a change command with one match', () => {
        const changeCmd = privates.parseChangeCmd('english to', t)
        expect(changeCmd.isDirectCmd).toEqual(false)
        expect(changeCmd.hasOne).toEqual(true)
      })

      it('should NOT detect a change command with no matches', () => {
        const changeCmd = privates.parseChangeCmd('blah to blah', t)
        expect(changeCmd.isDirectCmd).toEqual(false)
        expect(changeCmd.hasNone).toEqual(true)
      })
    })
  })

  describe('Test private methods with Spanish locale', () => {

    const t = new Localise(privates.getLocale({locale: 'es_GB'}))

    it('(in Spanish) should get context from message without strict matching', () => {
      let context = privates.getContextFromMessage('como se dice inglés a español por favor', false, t)
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('Inglés')
      expect(context.to).toEqual('Español')
      expect(context.hasTwo).toEqual(true)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(false)
    })

    it('(in Spanish) should get context from message with strict matching', () => {
      let context = privates.getContextFromMessage('inglés a español', true, t)
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('Inglés')
      expect(context.to).toEqual('Español')
      expect(context.hasTwo).toEqual(true)
      expect(context.hasOne).toEqual(false)
      expect(context.hasNone).toEqual(false)
    })

    it('(in Spanish) should get context from message with strict matching and mixed languges', () => {
      let context = privates.getContextFromMessage('english to español', true, t)
      expect(context.code).toEqual('en:es')
      expect(context.from).toEqual('Inglés')
      expect(context.to).toEqual('Español')

      context = privates.getContextFromMessage('spanish to english', true, t)
      expect(context.code).toEqual('es:en')
      expect(context.from).toEqual('Español')
      expect(context.to).toEqual('Inglés')
    })

    it('(in Spanish) should get context from code', () => {
      let context = privates.getContextFromCode('fr:de', t)
      expect(context.code).toEqual('fr:de')
      expect(context.from).toEqual('Francés')
      expect(context.to).toEqual('Alemán')
      expect(context.hasTwo).toEqual(true)
    })

    it('(in Spanish) should switch context', () => {
      const context = { code: 'en:ru', from: 'Inglés', to: 'Ruso' }
      const switched = privates.switchContext(context)
      expect(context.code).toEqual('ru:en')
      expect(context.from).toEqual('Ruso')
      expect(context.to).toEqual('Inglés')
    })

    it('(in Spanish) should get language name', () => {
      expect(privates.getLanguageName('zh-CN', t)).toEqual('Chino')
      expect(privates.getLanguageName('en', t)).toEqual('Inglés')
      expect(privates.getLanguageName('es', t)).toEqual('Español')
      expect(privates.getLanguageName('hu', t)).toEqual('Húngaro')
    })

    it('(in Spanish) should get language name from locale', () => {
      expect(privates.getLanguageNameLocale({locale: 'en_AU'}, t)).toEqual('Inglés')
      expect(privates.getLanguageNameLocale({locale: 'en_GB'}, t)).toEqual('Inglés')
      expect(privates.getLanguageNameLocale({locale: 'es_ES'}, t)).toEqual('Español')
      expect(privates.getLanguageNameLocale({locale: 'de_DE'}, t)).toEqual('Alemán')
      expect(privates.getLanguageNameLocale({locale: 'cs_CZ'}, t)).toEqual('Checo')
      expect(privates.getLanguageNameLocale({locale: 'nothing'}, t)).toEqual(undefined)
      expect(privates.getLanguageNameLocale({}, t)).toEqual(undefined)
      expect(privates.getLanguageNameLocale(null, t)).toEqual(undefined)
    })

    it('(in Spanish) should test that smart example is never undefined', () => {
      expect(privates.getContextSuggestion({locale: 'es_UK'}, t)[0]).toEqual('Español')
      expect(privates.getContextSuggestion({locale: 'es_UK'}, t)).not.toContain('undefined')
      expect(privates.getContextSuggestion({locale: 'es+test'}, t)).not.toContain('undefined')
      expect(privates.getContextSuggestion({locale: ''}, t)).not.toContain('undefined')
      expect(privates.getContextSuggestion({}, t)).not.toContain('undefined')
      expect(privates.getContextSuggestion(undefined, t)).not.toContain('undefined')
    })

    it('(in Spanish) should get all language names', () => {
      expect(privates.getAllLanguageNames(t).length).toEqual(91)
    })

    describe('(in Spanish) Test change commands', () => {
      it('(in Spanish) should detect a direct change command', () => {
        const changeCmd = privates.parseChangeCmd('ingles a espanol', t)
        expect(changeCmd.isDirectCmd).toEqual(true)
        expect(changeCmd.hasTwo).toEqual(true)
      })

      it('(in Spanish) should detect a possible change command', () => {
        const changeCmd = privates.parseChangeCmd('ingles al espanol', t)
        expect(changeCmd.isDirectCmd).toEqual(false)
        expect(changeCmd.hasTwo).toEqual(true)
      })

      it('(in Spanish) should NOT detect a change command with one match', () => {
        const changeCmd = privates.parseChangeCmd('ingles a', t)
        expect(changeCmd.isDirectCmd).toEqual(false)
        expect(changeCmd.hasOne).toEqual(true)
      })

      it('(in Spanish) should NOT detect a change command with no matches', () => {
        const changeCmd = privates.parseChangeCmd('blah to blah', t)
        expect(changeCmd.isDirectCmd).toEqual(false)
        expect(changeCmd.hasNone).toEqual(true)
      })
    })
  })
})
