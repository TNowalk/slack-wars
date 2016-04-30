'use strict';

const mongoose = require('mongoose');

const OutpostSchema = new mongoose.Schema({
  name: String,
  type: {
    type: Number,
    min: [1, 'Invalid Type'],
    max: [8, 'Invalid Type'],
  },
  bank: 0,
  prices: {
    fuel: 0,
    organics: 0,
    equipment: 0,
  },
  inventory: {
    fuel: 0,
    organics: 0,
    equipment: 0,
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

module.exports = mongoose.model('Outpost', OutpostSchema);
