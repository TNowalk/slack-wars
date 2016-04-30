'use strict';

const mongoose = require('mongoose');

const ClusterSchema = new mongoose.Schema({
  name: String,
  universe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Universe',
  },
  sectors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
  }],
});

module.exports = mongoose.model('Cluster', ClusterSchema);
