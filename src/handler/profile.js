'use strict';

const state = require('../lib/state');
const promise = require('../lib/async');

class ProfileHandler {

    constructor(bot) {
        this.bot = bot;
    }

    getProfile(sender) {
        return promise((resolve, reject) => {
            let next = this.bot;
            const profile = state.get(sender.id);
            if (profile !== undefined) {
                next = {
                    getProfile: (id, cb) => {
                        cb(null, profile);
                    }
                };
            }
            next.getProfile(sender.id, (err, profile) => {
                if (err) reject(err);
                resolve(profile);
            });
        });
    }
}

module.exports = ProfileHandler;
