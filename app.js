'use strict';

const logger = require('./lib/logger')();
const redact = require('redact-object');
const Bot = require('./lib/bot');
const Config = require('./lib/config');
const mongoose = require('mongoose');

require('./lib/utils');

let config;

/**
 * Load config
 */
const rawConfig = (() => {
  let retVal;
  try {
    retVal = require('./config');
  } catch (exception) {
    retVal = require('./config.default');
  }

  return retVal;
})();

try {
  config = Config.parse(rawConfig);
} catch (error) {
  logger.error('Could not parse config', error);
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(config.db.url);

logger.info('Using the following configuration:', redact(config, ['token', 'pass']));

const bot = new Bot(config);
bot.start();
