'use strict'

const state = require('../lib/state')

class ProfileHandler {

  constructor(bot) {
    this.bot = bot
  }

  getProfile(sender, cb) {
    let next = this.bot
    const profile = state.get(sender.id)
    if (profile !== undefined) {
      next = {
        getProfile: (id, cb) => {
          cb(null, profile)
        }
      }
    }

    return next.getProfile(sender.id, cb)
  }
}

module.exports = ProfileHandler
