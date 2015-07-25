

var d3 = require('d3');
var GeneCluster = require('./gene-cluster.js')


var geneclusterAPI = {
  version: '0.0.1',
  GeneCluster: GeneCluster,
  test: function() {
    return new Promise(function(resolve, reject) {
      resolve('test resolve');
    });
  }
};

module.exports = geneclusterAPI;