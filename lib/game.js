'use strict';

const logger = require('./logger')();

// Load models
require('./models/universe.model');
require('./models/cluster.model');
require('./models/sector.model');
require('./models/outpost.model');

const Universe = require('./models/universe.model');

const COMMANDS = {
  register: {
    name: 'register',
    description: 'Registers you as a player',
    pattern: /^\b(register)\b/i,
    public: false,
    registered: false,
  },
  display: {
    name: 'display',
    description: 'Display information about the sector you currently located',
    pattern: /^\b(display|d)\b/i,
    public: false,
    registered: true,
  },
};

const PUBLIC_EVENTS = ['direct_mention', 'ambient'];
const IGNORE_EVENTS = ['ambient'];

/**
 * @module Bot
 */
class Game {
  /**
   * Constructor.
   *
   * @constructor
   * @param {string} teamId Team ID
   */
  constructor(teamId) {
    this.teamId = teamId;

    this.commands = COMMANDS;

    // Get Universe
    this.universe = null;
    this.clusters = null;
    this.sectors = null;
    this.outposts = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      Universe.findOne().populate('clusters sectors outposts').exec((err, doc) => {
        if (err) reject(err);

        this.universe = doc;
        this.clusters = doc.clusters;
        this.sectors = doc.sectors;
        this.outposts = doc.outposts;

        resolve(this.universe);
      });
    });
  }

  handleError(err) {
    logger.error(err);
    process.exit(1);
  }

  command(player, event, message) {
    return new Promise((resolve) => {
      const retVal = [];
      const command = this.extractCommand(message);

      // If command can't be run in public channel, but was a public message
      if (command === null) {
        retVal.push({
          message: `Sorry, I did not understand the command _"${message}"_`,
        });
      } else if (!command.command.public && this.isPublicEvent(event)) {
        if (IGNORE_EVENTS.indexOf(event) === -1) {
          retVal.push({
            message: 'The *display* command can only be run in a direct message',
            private: true,
          });
        }
      } else if (command.command.registered && !this.isActivePlayer(player)) {
        // Else, command requries a registered user and user is not active
        retVal.push({
          message: 'You must be registered to play, ' +
            'send me a private message that says *register*',
          private: true,
        });
      } else {
        switch (command.command.name) {
          case this.commands.display.name:
            retVal.push({
              message: 'Doing display command',
              private: false,
            });
            break;
          default:
            retVal.push({
              message: `I heard the command _"${message}"_, but I'm not sure what to do`,
            });
        }
      }

      resolve(retVal);
    });
  }

  extractCommand(message) {
    let retVal = null;

    if (message && message.length) {
      Object.keys(this.commands).forEach((commandKey) => {
        if (this.commands && this.commands.hasOwnProperty(commandKey)) {
          const command = this.commands[commandKey];
          const matches = message.match(command.pattern);
          if (matches && matches.length === 2) {
            retVal = {
              command,
              args: message.replace(matches.splice(1), '').trim().split(' '),
            };
          }
        }
      });
    }

    return retVal;
  }

  isPublicEvent(event) {
    return PUBLIC_EVENTS.indexOf(event) !== -1;
  }

  isActivePlayer(player) {
    return false;
  }
}

module.exports = Game;
