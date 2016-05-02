'use strict';

const mongoose = require('mongoose');

const SectorSchema = new mongoose.Schema({
  name: String,
  number: Number,
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

SectorSchema.methods.hasNeighbor = (sector) => {
  let found = false;

  this.neighbors.forEach((neighbor) => {
    if (neighbor.toString() === sector._id.toString()) {
      found = true;
    }
  });

  return found;
};

SectorSchema.statics.areNeighbors = (s1, s2) => {
  let found = false;

  s1.neighbors.forEach((neighbor) => {
    if (neighbor.toString() === s2._id.toString()) {
      found = true;
    }
  });

  return found;
};

module.exports = mongoose.model('Sector', SectorSchema);
