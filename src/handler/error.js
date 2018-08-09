'use strict';

const Logger = require('../lib/logger');

class ErrorHandler {

    static handleError(err) {
        Logger.log('error', err.message);
    }

}

module.exports = ErrorHandler;
