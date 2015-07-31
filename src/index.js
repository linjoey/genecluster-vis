

var d3 = require('d3');
var browser = require('./core/browser.js');

var geneclusterAPI = browser;

geneclusterAPI.version = '0.0.1';

module.exports = geneclusterAPI;

//var parseString = require('xml2js').parseString;
//
//  d3.xhr('http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=1[chr]+AND+1[CHRPOS]:100000[CHRPOS]+AND+human[ORGAN]'
//    , function(e,d) {
//      console.log(d);
//    parseString(d.response, function (err, result) {
//      console.log(result);
//    });
//  })
