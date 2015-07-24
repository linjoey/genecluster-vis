
var d3 = require('d3');

var ensemblHost = 'http://rest.ensembl.org/';

var genedata = {
  get: function(specie, chr, start, stop) {
    var url = ensemblHost
      + 'overlap/region/'
      + specie + '/'
      + chr + ':'
      + start + '-'
      + stop + '?'
      + 'feature=gene;content-type=application/json';

    return new Promise(function(resolve, reject) {
      d3.json(url, function(error, data) {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      })
    });
  }
};

module.exports = genedata;