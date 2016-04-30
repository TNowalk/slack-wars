'use strict';

const mongoose = require('mongoose');
const argv = require('yargs').argv;
// const clone = require('clone');
const async = require('async');
const logger = require('./logger')();
const Config = require('./config');
const utils = require('./utils');

// Include models
const Universe = require('./models/universe.model');
const Cluster = require('./models/cluster.model');
const Sector = require('./models/sector.model');
const Outpost = require('./models/outpost.model');

function handleError(err) {
  logger.error(err);
  process.exit(1);
}

logger.info('Running big-bang');

let config;

/**
 * Load config
 */
const rawConfig = (() => {
  let retVal;
  try {
    retVal = require('../config');
  } catch (exception) {
    retVal = require('../config.default');
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

Universe.find((err, universes) => {
  if (!universes || argv.force) {
    if (universes.length) {
      logger.info('Imploding existing Universes');
    }

    Universe.remove({}, (err) => {
      if (err) handleError(err);

      logger.info('Creating a new universe');
      Universe.create({}, (err, doc) => {
        if (err) handleError(err);

        const universe = doc;

        Sector.remove({}, (err) => {
          if (err) handleError(err);

          const maxSectors = config.game.clusters.min * config.game.clusters.size;
          const newSectors = [];
          for (let i = 0; i < maxSectors; i++) {
            newSectors.push({
              name: `Sector ${i + 1}`,
              universe,
            });
          }

          Sector.create(newSectors, (err, docs) => {
            if (err) handleError(err);

            let sectors = docs;

            logger.info(`  > Created ${sectors.length} Sectors`);

            Cluster.remove({}, (err) => {
              if (err) handleError(err);

              const newClusters = [];
              for (let i = 0; i < config.game.clusters.min; i++) {
                newClusters.push({
                  name: `Cluster ${i + 1}`,
                  universe,
                });
              }

              Cluster.create(newClusters, (err, docs) => {
                if (err) handleError(err);

                const clusters = docs;

                logger.info(`  > Created ${clusters.length} Clusters`);

                // Randomize the sectors
                sectors = utils.shuffle(sectors);

                let queue = [];

                // Loop through clusters and assign the sectors
                for (let i = 0; i < clusters.length; i++) {
                  while (clusters[i].sectors.length < config.game.clusters.size) {
                    const sector = sectors.pop();

                    // Associate the cluster with the sector
                    sector.cluster = clusters[i];

                    // Add sector to cluster
                    clusters[i].sectors.push(sector);

                    // Add Sector to async queue
                    queue.push(sector.save);

                    // Add sector to the universe
                    universe.sectors.push(sector);
                  }

                  // Add cluster to async queue
                  queue.push(clusters[i].save);

                  // Add cluster to the universe
                  universe.clusters.push(clusters[i]);
                }

                // Add universe to async queue
                queue.push(universe.save);

                // Save the sectors and cluster relationships
                async.parallel(queue, (err) => {
                  if (err) handleError(err);

                  logger.info('Sectors Added to Clusters');

                  for (let i = 0; i < clusters.length; i++) {
                    logger.info(`  > ${clusters[i].name} - ${clusters[i].sectors.length} Sectors`);
                  }

                  // Pull down a fresh list of sectors
                  Sector.find((err, docs) => {
                    if (err) handleError(err);

                    sectors = docs;

                    // Reset queue
                    queue = [];

                    // Loop through the clusters again to set sector neighbors
                    for (let i = 0; i < clusters.length; i++) {
                      // Loop through the sectors
                      for (let j = 0; j < clusters[i].sectors.length; j++) {
                        let sector = null;

                        for (let k = 0; k < sectors.length; k++) {
                          if (sectors[k]._id.toString() === clusters[i].sectors[j].toString()) {
                            sector = sectors[k];
                          }
                        }

                        if (clusters[i].sectors[j + 1]) {
                          sector.neighbors.push(clusters[i].sectors[j + 1]);
                        }

                        if (Math.random() > config.game.sectors.connections.ratios.two) {
                          const idx = Math.floor(Math.random() * clusters[i].sectors.length);
                          sector.neighbors.push(clusters[i].sectors[idx]);
                        }

                        if (Math.random() > config.game.sectors.connections.ratios.one) {
                          const first = clusters[i].sectors[0];
                          let last = null;

                          for (let k = 0; k < sectors.length; k++) {
                            const idx = clusters[i].sectors.length - 1;
                            if (sectors[k]._id.toString() === clusters[i].sectors[idx].toString()) {
                              last = sectors[k];
                            }
                          }

                          last.neighbors.push(first);
                        } else {
                          for (let k = clusters[i].sectors.length - 1; k >= 0; k--) {
                            if (!clusters[i].sectors[k - 1]) break;
                            let sectorOne = null;
                            const sectorTwo = clusters[i].sectors[k - 1];

                            for (let x = 0; x < sectors.length; x++) {
                              if (sectors[x]._id.toString() === clusters[i].sectors[k].toString()) {
                                sectorOne = sectors[x];
                              }
                            }

                            sectorOne.neighbors.push(sectorTwo);
                          }
                        }

                        queue.push(sector.save);
                      }
                    }

                    // Save the sector neighbors
                    async.parallel(queue, (err) => {
                      if (err) handleError(err);

                      logger.info('Neighboring Sectors Connected');

                      for (let i = 0; i < sectors.length; i++) {
                        logger.info(`  > ${sectors[i].name} - ` +
                          `${sectors[i].neighbors.length} Neighbors`);
                      }

                      // Set up shop
                      const maxShops = Math.floor(sectors.length * config.game.outposts.density);

                      const newOutposts = [];
                      const matchedSectors = [];
                      const outpostCounts = {
                        1: 0,
                        2: 0,
                        3: 0,
                        4: 0,
                        5: 0,
                        6: 0,
                        7: 0,
                        8: 0,
                      };

                      for (let i = 0; i < maxShops; i++) {
                        const idx = Math.floor(Math.random() * sectors.length) + 1;

                        const sector = sectors[idx];

                        if (matchedSectors.indexOf(sector) > -1) {
                          continue;
                        }

                        if (!sector) {
                          continue;
                        }

                        matchedSectors.push(sector);

                        // Create a new shop
                        const type = Outpost.getRandomType(config.game.outposts.probability);

                        outpostCounts[type]++;

                        newOutposts.push({
                          name: `Outpost ${i + 1}`,
                          type,
                          universe,
                          sector,
                        });
                      }

                      Outpost.remove({}, (err) => {
                        if (err) handleError(err);

                        Outpost.create(newOutposts, (err, docs) => {
                          if (err) handleError(err);

                          const outposts = docs;

                          logger.info(`Created ${outposts.length} Outposts`);

                          Object.keys(outpostCounts).forEach((key) => {
                            if (outpostCounts && outpostCounts.hasOwnProperty(key)) {
                              logger.info(`  > Class ${key}: ${outpostCounts[key]} Outposts`);
                            }
                          });

                          queue = [];

                          // Loop through new outposts and add to sector
                          for (let i = 0; i < outposts.length; i++) {
                            let sector = null;

                            for (let j = 0; j < sectors.length; j++) {
                              if (sectors[j]._id.toString() === outposts[i].sector._id.toString()) {
                                sector = sectors[j];
                              }
                            }

                            sector.outposts.push(outposts[i]);
                            queue.push(sector.save);
                          }

                          // Save the sector neighbors
                          async.parallel(queue, (err) => {
                            if (err) handleError(err);

                            logger.info('Outposts Added to Sectors');

                            for (let i = 0; i < sectors.length; i++) {
                              logger.info(`  > ${sectors[i].name} - ` +
                                `${sectors[i].outposts.length} Outposts`);
                            }

                            mongoose.disconnect();
                          });
                        });
                      });
                    });

                    return null;
                  });
                });
              });
            });
          });
        });
      });
    });
  } else {
    handleError('Found existing universe, re-run with force flag to wipe and start over');
  }


  return null;
});
