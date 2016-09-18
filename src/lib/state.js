let store = {}

// number of keys to store in state before flushing
const sizeLimit = 1000

function get(key) {
  return store[key]
}

function set(key, value) {
  store[key] = value
}

function clear() {
  store = {}
}

function size() {
  return Object.keys(store).length
}

function flushIfSizeLimitExceeded() {
  if (size() < sizeLimit) return
  clear()
}

module.exports = {
  get, set, clear, size, flushIfSizeLimitExceeded
}
