'use strict'

const mixpanel = require('mixpanel')
const config = require('../config')

let _mixpanel = mixpanel.init(config.mixpanel_token)

class Mixpanel {

  static setPerson(sender, profile) {
    _mixpanel.people.set(sender.id, {
      $first_name: profile.first_name,
      $last_name: profile.last_name,
      $created: (new Date()).toISOString(),
      distinctId: sender.id,
      locale: profile.locale,
      timezone: profile.timezone,
      gender: profile.gender
    })
  }

  static track(event, sender, message) {
    _mixpanel.track(event, { 
      distinctId: sender.id,
      message: message 
    })
  }
}

module.exports = Mixpanel