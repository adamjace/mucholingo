'use strict'

const mixpanel = require('mixpanel')
const config = require('../config')

let _mixpanel = mixpanel.init(config.mixpanel_token)

class Mixpanel {

  static setPerson(sender, profile) {
    _mixpanel.people.set({
      $first_name: profile.first_name,
      $last_name: profile.last_name,
      $created: (new Date()).toISOString(),
      locale: profile.locale,
      timezone: profile.timezone,
      gender: profile.gender
    })
    _mixpanel.identify(sender.id)
  }

  static track(event, sender, message) {
    _mixpanel.track(event, { 
      distinctId: sender.id,
      message: message 
    })
  }
}

module.exports = Mixpanel