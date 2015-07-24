

var d3 = require('d3');
var genedata = require('./genedata.js');

genedata.get('human','1','1','100000')
  .then(function(d){console.log(d)});

var geneclusterAPI = {
  version: '0.0.1',
  test: function() {
    return new Promise(function(resolve, reject) {
      resolve('test resolve');
    });
  }
};

module.exports = geneclusterAPI;