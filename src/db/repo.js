const db = require('./redis')
const state = require('../lib/state')
const Logger = require('../lib/logger')
const promise = require('../lib/async')

// repository wrapper
// get: fetches from cache/state if it exists, or from the redis instance
// set: stores to redis instance
const repo = (senderId) => {

  // get the current profile from state
  const profile = state.get(senderId) || {}

  const get = () => {
    return promise((resolve, reject) => {
      if (profile.context != null) {
        return resolve({ context: profile.context, source: 'state' })
      }
      db.getAsync(senderId).then((context, err) => {
        if (err) return reject(err)
        Logger.log('info', `fetching data for user "${senderId}"`)
        setState(profile, context)
        const source = 'redis'
        return resolve({context, source})
      })
    })
  }

  const set = (context) => {
    return promise((resolve) => {
      setState(profile, context)
      db.setAsync(senderId, context).then(() => {
        Logger.log('info', `saving data for user "${senderId}"`)
        return resolve(context)
      })
    })
  }

  // setState assigns the user context to the state map
  const setState = (profile, context) => {
    profile.context = context
    state.set(profile.id, profile)
  }

  return {
    get, set
  }
}

module.exports = repo
