'use strict';

const logger = require('./logger')();

// Load models
require('./models/universe.model');
require('./models/cluster.model');
require('./models/sector.model');
require('./models/outpost.model');

const Universe = require('./models/universe.model');
const Player = require('./models/player.model');
const Sector = require('./models/sector.model');
const Outpost = require('./models/outpost.model');

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
  status: {
    name: 'status',
    description: 'Display your current statistics',
    pattern: /^\b(me|status)\b/i,
    public: false,
    registered: true,
  },
  move: {
    name: 'move',
    description: 'Move to a sector',
    pattern: /^\b(move|m)\b/i,
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

    this.players = null;
  }

  init(lookup) {
    return new Promise((resolve, reject) => {
      this.lookup = lookup;

      Universe.findOne().populate('clusters sectors outposts players').exec((err, doc) => {
        if (err) reject(err);

        this.universe = doc;
        this.clusters = doc.clusters;

        this.players = new Map();

        doc.players.forEach((player) => {
          this.players.set(player._id, player);
          // A player can be looked up by hash or Slack ID
          this.players.set(player.slackId, player);
        });

        this.sectors = new Map();

        doc.sectors.forEach((sector) => {
          this.sectors.set(sector._id.toString(), sector);
          // Need to be able to look up by sector number
          this.sectors.set(sector.number, sector);
        });

        this.outposts = new Map();

        doc.outposts.forEach((outpost) => {
          this.outposts.set(outpost._id.toString(), outpost);
        });

        resolve(this.universe);
      });
    });
  }

  handleError(err) {
    logger.error(err);
    process.exit(1);
  }

  command(playerId, event, message) {
    return new Promise((resolve) => {
      const command = this.extractCommand(message);

      if (command === null) {
        // Did not match the command to any known commands
        resolve([{
          message: `Sorry, I did not understand the command _"${message}"_`,
        }]);
      } else if (!command.command.public && this.isPublicEvent(event)) {
        // Command can't be run in public channel, but was a public message
        if (IGNORE_EVENTS.indexOf(event) === -1) {
          resolve([{
            message: 'The *display* command can only be run in a direct message',
            private: true,
          }]);
        }
      } else if (command.command.registered && !this.isActivePlayer(playerId)) {
        // Command requries a registered user and user is not active
        resolve([{
          message: 'You must be registered to play, ' +
            'send me a private message that says *register*',
          private: true,
        }]);
      } else {
        switch (command.command.name) {
          case this.commands.register.name:
            this.register(playerId).then((player) => {
              resolve([{
                message: `Welcome to Slack Wars ${player.name.first}!  ` +
                  'Type *[d]isplay* to see some information about the sector.',
              }]);
            }, (err) => {
              resolve([{
                message: err,
              }]);
            });
            break;
          case this.commands.display.name:
            this.display(playerId).then((output) => {
              resolve([{
                message: output,
              }]);
            }, (err) => {
              resolve([{
                message: err,
              }]);
            });
            break;
          case this.commands.status.name:
            this.playerStatus(playerId).then((output) => {
              resolve([{
                message: output,
              }]);
            }, (err) => {
              resolve([{
                message: err,
              }]);
            });
            break;
          case this.commands.move.name:
            this.move(playerId, command.args[0]).then((output) => {
              resolve([{
                message: output,
              }]);
            }, (err) => {
              resolve([{
                message: err,
              }]);
            });
            break;
          default:
            resolve([{
              message: `I heard the command _"${message}"_, but I'm not sure what to do`,
            }]);
        }
      }
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

  setLookup(lookup) {
    this.lookup = lookup;
  }

  isPublicEvent(event) {
    return PUBLIC_EVENTS.indexOf(event) !== -1;
  }

  isActivePlayer(playerId) {
    return !!this.players.get(playerId);
  }

  hr(c, l) {
    const char = typeof c !== 'undefined' ? c : '-';
    const length = typeof l !== 'undefined' ? l : 46;

    let out = '';
    for (let i = 0; i < length; i++) {
      out += char;
    }
    return `${out}\n`;
  }

  register(playerId) {
    return new Promise((resolve, reject) => {
      if (this.isActivePlayer(playerId)) {
        reject('Player already registered');
        return;
      }

      // Grab the user info from the map
      const userInfo = this.lookup.get(playerId);

      if (userInfo) {
        let player = new Player({
          name: {
            first: userInfo.profile.first_name,
            last: userInfo.profile.last_name,
          },
          username: userInfo.name,
          slackId: userInfo.id,
          universe: this.universe._id,
          sector: this.universe.sectors[0],
        });

        player.save((err, doc) => {
          if (err) this.handleError(err);

          player = doc;

          this.players.set(player._id, player);
          this.players.set(player.slackId, player);

          this.universe.players.push(player);

          this.universe.save((err, universe) => {
            if (err) this.handleError(err);

            this.universe = universe;

            // TODO Push player into sector!

            resolve(player);
          });
        });
      } else {
        reject(`Invalid player ID ${playerId}`);
      }
    });
  }

  display(playerId) {
    return new Promise((resolve, reject) => {
      if (!this.isActivePlayer(playerId)) {
        reject(`Invalid player ID ${playerId}`);
        return;
      }

      const player = this.players.get(playerId);

      const sector = this.sectors.get(player.sector.toString());

      if (!sector) {
        reject(`Invalid sector ${player.sector.toString()}`);
        return;
      }

      let output = '```\n';

      output += `${this.hr()}` +
        `${sector.name}\n` +
        `${this.hr()}`;

      // If there are outposts, display them
      if (sector.outposts) {
        sector.outposts.forEach((o) => {
          const outpost = this.outposts.get(o.toString());
          output += `${outpost.name} [${Outpost.getTypeString(outpost.type)}]\n`;
        });
        output += '\n';
      }

      // Load Neighbor information
      const neighbors = [];

      sector.neighbors.forEach((neighbor) => {
        neighbors.push(this.sectors.get(neighbor.toString()));
      });

      output += `Neighbors: [${neighbors.map((s) => s.number).join(',')}]\n`;

      output += '```';

      resolve(output);
    });
  }

  playerStatus(playerId) {
    return new Promise((resolve, reject) => {
      if (!this.isActivePlayer(playerId)) {
        reject(`Invalid player ID ${playerId}`);
        return;
      }

      const player = this.players.get(playerId);

      let output = '```\n';
      output += this.hr('=');
      output += `${player.name.first.rpad(' ', 36)} Level: 99\n`;
      output += this.hr();
      output += 'Credits: 12,345\n';
      output += this.hr();
      output += 'Ship: Default Cargo Ship\n';
      output += 'Cargo:\n';
      output += '    Fuel:        0 / 100\n';
      output += '    Organics:    0 / 100\n';
      output += '    Equipment:   0 / 100\n';
      output += '    Empty:     100 / 100\n';
      output += this.hr('=');
      output += '```';

      resolve(output);
    });
  }

  move(playerId, sNum) {
    const sectorNumber = parseInt(sNum, 10);

    return new Promise((resolve, reject) => {
      if (!this.isActivePlayer(playerId)) {
        reject(`Invalid player ID ${playerId}`);
        return;
      }

      if (!sectorNumber || !this.sectors.get(sectorNumber)) {
        reject(`Invalid sector number ${sectorNumber}`);
        return;
      }

      const target = this.sectors.get(sectorNumber);
      const player = this.players.get(playerId);

      if (target._id.toString() === player.sector.toString()) {
        resolve(`You are already in ${target.name}!`);
        return;
      }

      // const sector = new Sector(this.sectors.get(player.sector.toString()));
      const sector = this.sectors.get(player.sector.toString());

      if (Sector.areNeighbors(sector, target)) {
        player.sector = target._id;

        player.save((err, doc) => {
          this.players.set(playerId, doc);
          this.players.set(doc._id, doc);

          // TODO Remove player from old sector and add to new sector
          // TODO Decrement player moves with ship

          this.display(playerId).then((o) => {
            resolve(`You warped to ${target.name} at light speed!\n${o}`);
          }, (err) => {
            reject(err);
          });
        });
      } else {
        // TODO Calculate and display jump path for user
        resolve('Not neighbor');
      }
    });
  }
}

module.exports = Game;
