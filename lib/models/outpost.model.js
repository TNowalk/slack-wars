'use strict';

const mongoose = require('mongoose');

const OutpostSchema = new mongoose.Schema({
  name: String,
  type: {
    type: Number,
    min: [1, 'Invalid Type'],
    max: [8, 'Invalid Type'],
  },
  bank: {
    type: Number,
    default: 0,
  },
  prices: {
    fuel: {
      type: Number,
      default: 0,
    },
    organics: {
      type: Number,
      default: 0,
    },
    equipment: {
      type: Number,
      default: 0,
    },
  },
  inventory: {
    fuel: {
      type: Number,
      default: 0,
    },
    organics: {
      type: Number,
      default: 0,
    },
    equipment: {
      type: Number,
      default: 0,
    },
  },
  universe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Universe',
  },
  sector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
  },
});

OutpostSchema.statics.getRandomType = (probability) => {
  const chance = Math.random();

  switch (true) {
    case (chance < probability.one):
      return 1;
    case chance < probability.two:
      return 2;
    case chance < probability.three:
      return 3;
    case chance < probability.four:
      return 4;
    case chance < probability.five:
      return 5;
    case chance < probability.six:
      return 6;
    case chance < probability.seven:
      return 7;
    case chance < probability.eight:
      return 8;
    default:
      return null;
  }
};

OutpostSchema.statics.getTypeString = (type) => {
  /*
    Type 1 - (BBS) - buying fuel ore, buying organics, selling equipment
    Type 2 - (BSB) - buying fuel ore, selling organics, buying equipment
    Type 3 - (SBB) - selling fuel ore, buying organics, buying equipment
    Type 4 - (SSB) - selling fuel ore, selling organics, buying equipment
    Type 5 - (SBS) - selling fuel ore, buying organics, selling equipment
    Type 6 - (BSS) - buying fuel ore, selling organics, selling equipment
    Type 7 - (SSS) - selling fuel ore, selling organics, selling equipment
    Type 8 - (BBB) - buying fuel ore, buying organics, buying equipment
  */
  switch (type) {
    case 1: return 'BBS';
    case 2: return 'BSB';
    case 3: return 'SBB';
    case 4: return 'SSB';
    case 5: return 'SBS';
    case 6: return 'BSS';
    case 7: return 'SSS';
    case 8: return 'BBB';
    default: return null;
  }
};

module.exports = mongoose.model('Outpost', OutpostSchema);
