
var d3 = require('d3');

var gAxis = (function() {
  var _d3axis = d3.svg.axis().orient('top')
    , _height = 0
    , _offset  = [0, 0]; //[x, y] shift from parent

  function updateTickLines(selection) {
    selection.selectAll('.tick').select('line')
      .attr('y2', _height - _offset[1]);
  }

  var _axis = function(selection) {
    if (selection !== undefined) {
      selection
        .attr('transform', "translate(" + _offset[0] + "," + _offset[1] + ")")
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

  _axis.offset = function(arg) {
    if (arg) {
      _offset = arg;
      return _axis;
    } else {
      return _offset;
    }
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