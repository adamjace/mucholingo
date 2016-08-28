let store = {}

const state = {
  get: (key) => {
    return store[key]
  },
  set: (key, value) => {
    store[key] = value
  },
  clear: () => {
    store = {}
  },
  expose: () => {
    return store
  }
}

module.exports = state
