const promisify = require('../../lib/promisify')

let context = ''

const getAsync = () => {
  return promisify((resolve) => {
    resolve(context)
  })
}

const setAsync = (senderId, context) => {
  db.__setContext(context)
  return promisify((resolve) => {
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
