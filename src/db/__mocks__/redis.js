const async = require('../../lib/async')

let context = ''

const getAsync = () => {
  return async((resolve) => {
    resolve(context)
  })
}

const setAsync = (senderId, context) => {
  db.__setContext(context)
  return async((resolve) => {
    resolve(context)
  })
}

const db = {
  getAsync: getAsync,
  setAsync: setAsync
}

db.__setContext = (value) => {
  context = value
}

module.exports = db
