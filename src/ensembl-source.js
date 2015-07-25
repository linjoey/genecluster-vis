
var d3 = require('d3');

var ENSEMBL_HOST = 'http://rest.ensembl.org/';
var RESOURCE = {
  REGION_OVERLAP: ENSEMBL_HOST + 'overlap/region/'
};

module.exports = {
  genes: function (specie, chr, start, stop) {
    var url = RESOURCE.REGION_OVERLAP
      + specie + '/'
      + chr + ':'
      + start + '-'
      + stop + '?'
      + 'feature=gene;content-type=application/json';
    return new Promise(function (resolve, reject) {
      d3.json(url, function (error, data) {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      })
    });
  },

  lookup: function(EnsemblID) {
    //
  }
};
