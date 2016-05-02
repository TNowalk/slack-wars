'use strict';

const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  name: {
    first: String,
    last: String,
  },
  username: String,
  slackId: String,
  universe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Universe',
  },
  sector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
  },
  ships: [],
  cash: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Player', PlayerSchema);
