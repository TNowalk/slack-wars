'use strict';

const mongoose = require('mongoose');

const SectorSchema = new mongoose.Schema({
  name: String,
  cluster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster',
  },
  universe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Universe',
  },
  neighbors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
  }],
  outposts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outpost',
  }],
});

module.exports = mongoose.model('Sector', SectorSchema);
