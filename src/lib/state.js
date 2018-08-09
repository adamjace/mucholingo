let store = {};

// number of keys to store in state before flushing
const sizeLimit = 1000;

const get = (key) => {
    return store[key];
};

const set = (key, value) => {
    store[key] = value;
};

const clear = () => {
    store = {};
};

const size = () => {
    return Object.keys(store).length;
};

const flushIfSizeLimitExceeded = () => {
    if (size() < sizeLimit) return;
    clear();
};

module.exports = {
    get,
    set,
    clear,
    size,
    flushIfSizeLimitExceeded
};
