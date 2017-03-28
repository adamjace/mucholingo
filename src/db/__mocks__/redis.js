const Promise = require('bluebird')

let context = '';

const db = {
  getAsync: getAsync,
  setAsync: setAsync
}

function getAsync(senderId) {
  return new Promise((resolve, reject) => {
    resolve(context)
  })
}

function setAsync(senderId, context) {
  db.__setContext(context);
  return new Promise((resolve, reject) => {
    resolve(context)
  })
}

db.__setContext = (value) => {
  context = value
}

module.exports = db;
