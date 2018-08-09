'use strict';

const config = {
    'port': process.env.PORT,
    'fb_token': process.env.FB_TOKEN,
    'fb_verify': process.env.FB_VERIFY,
    'fb_secret': process.env.FB_SECRET,
    'fb_page_id': process.env.FB_PAGE_ID,
    'google_key': process.env.GOOGLE_KEY,
    'mixpanel_token': process.env.MIXPANEL_TOKEN,
    'redis_host': process.env.REDIS_HOST,
    'redis_port': process.env.REDIS_PORT,
    'redis_user': process.env.REDIS_USER,
    'redis_password': process.env.REDIS_PASSWORD,
    'ssl_key': process.env.SSL_KEY,
    'ssl_cert': process.env.SSL_CERT,
    'ssl_ca': process.env.SSL_CA
};

for (const key of Object.keys(config)) {
    if (!config[key]) {
        throw new Error(`Invalid configuration. Missing "${key}"`);
    }
}

module.exports = config;
