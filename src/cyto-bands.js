
var d3        = require('d3')
  , bandsData = require('./data/ideogram_9606_850.json')
  , utils     = require('./utils.js');


function getBandsOnSegment(segment) {
  var filtered = [];
  var foundFirst = false;
  for (var i = 0; i < bandsData.length; ++i) {
    var band = bandsData[i];
    if (foundFirst) {
      if (band['#chromosome'] != segment) {
        break;
      }
    }
    if (band['#chromosome'] == segment) {
      foundFirst = true;
      filtered.push(band)
    }
  }
  return filtered;
}

var cytoBands = (function() {

  var _segment  = '1'
    , _offset   = [0, 0]
    , _xscale   = null
    , _bands    = null

  function updateBands() {
    if (_bands) {
      _bands
        .attr('x', function (d) {
          return _xscale(d.bp_start);
        })
        .attr('y', 0)
        .attr('width', function (d) {
          return _xscale(d.bp_stop) - _xscale(d.bp_start);
        })
    }
  }

  var _cytoBands = function(selection) {
    if (selection !== undefined) {
      var bandData = getBandsOnSegment(_segment);

      var g = selection
        .attr('transform', "translate(" + _offset[0] + "," + _offset[1] + ")")
        .selectAll('g')
        .data(bandData)
        .enter()
        .append('g')
        .attr('class', 'genecluster-band')

      _bands = g.append('rect')
        .attr('class', function(d) {
          var c =  d.stain;
          if (d.density) {
            c += '-' + d.density;
          }
          return c
        })
        .attr('height', 25)

      updateBands();

    }
    return _cytoBands;
  };

  _cytoBands.segment = function(arg) {
    if (arg) {
      _segment = arg;
      return _cytoBands;
    } else {
      return _segment;
    }
  };

  _cytoBands.scale = function(arg) {
    if (arg) {
      _xscale = arg;
      return _cytoBands;
    } else {
      return _xscale;
    }
  };

  _cytoBands.offset = function(arg) {
    if (arg) {
      _offset = arg;
      return _cytoBands;
    } else {
      return _offset;
    }
  };

  _cytoBands.update = function() {
    updateBands();
  };

  return _cytoBands;
})();

module.exports = cytoBands;