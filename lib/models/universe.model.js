'use strict';

const mongoose = require('mongoose');

const UniverseSchema = new mongoose.Schema({
  clusters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster',
  }],
  sectors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
  }],
  outposts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outpost',
  }],
  traders: [],
  players: [],
});

module.exports = mongoose.model('Universe', UniverseSchema);
