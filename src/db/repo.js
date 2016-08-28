const db = require('./redis')
const state = require('../lib/state')
const Logger = require('../lib/logger')

// repository wrapper
// get: fetches from cache/state if it exists, or from the redis instance
// set: stores to redis instance
const repo = (senderId) => {
  const profile = state.get(senderId) || {}
  return {
    get: () => {
      return new Promise((resolve, reject) => {
        if (profile.context) {
          return resolve({ context: profile.context, source: 'state' })
        }
        db.getAsync(senderId).then((context, err) => {
          if (err) return reject(err)
          Logger.log(`redis: fetching data for: ${senderId}`)
          setState(profile, context)
          const source = 'redis'
          return resolve({context, source})
        })
      })
    },
    set: (context) => {
      return new Promise((resolve) => {
        setState(profile, context)
        db.setAsync(senderId, context).then(() => {
          Logger.log(`redis: saving data for: ${senderId}`)
          return resolve(context)
        })
      })
    }
  }
}

// setState assigns the user context to the state map
function setState(profile, context) {
  profile.context = context
  state.set(profile.id, profile)
}

module.exports = repo
