
var d3 = require('d3');

var gAxis = (function() {

  var _d3axis = d3.svg.axis().orient('top');

  var _height = 0;

  var PADDING = 25;

  function updateTickLines(selection) {
    selection.selectAll('.tick').select('line')
      .attr('y2', _height - PADDING);
  }

  var _axis = function(selection) {

    if (selection !== undefined) {
      selection
        .attr('transform', "translate(0," + PADDING + ")")
        .attr('class', 'genecluster-topaxis')
        .call(_d3axis)
        .call(updateTickLines)
    }

    _axis.update = function() {
      selection.call(_d3axis);
      _axis.adjustTickLine();
      return _axis;
    };

    _axis.adjustTickLine = function() {
      selection.call(updateTickLines)
    };

    return _axis;
  };

  _axis.scale = function(arg) {
    _d3axis.scale(arg);
    return _axis;
  };

  _axis.height = function(arg) {
    _height = arg;
    return _axis;
  };

  return _axis;
})();

module.exports = gAxis;