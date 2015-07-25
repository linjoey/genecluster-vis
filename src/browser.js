
var d3          = require('d3')
  , assign      = require('lodash.assign')

var ensemblsrc  = require('./ensembl-source.js')
  , utils       = require('./utils.js')
  , gAxis       = require('./genome-axis.js')
  , cytoBands   = require('./cyto-bands.js')

var browser = (function() {

  function _constructor(args) {

    var options = assign({
      //default options
      target : null,
      width : 1000,
      height : 250,
      specie : 'human',
      region : {
        segment: '22',
        start: '1',
        stop: '5000000'
      }
    }, args);

    var domTarget = options.target ? d3.select(options.target) : d3.selection()
      , yOffset = 25
      , svgTarget = null

      , xscale = d3.scale.linear()
        .domain([options.region.start, options.region.stop])
        .range([0, options.width])

      , svgTopAxis = gAxis()
        .height(options.height)
        .offset([0, yOffset])
        .scale(xscale)

      , zoomBehaviour = d3.behavior.zoom()
        .x(xscale)
        .scaleExtent([1, 1000])

      , svgCytoBands = cytoBands(undefined, options.width)
        .scale(xscale)
        .offset([0, yOffset + 1])
        .segment(options.region.segment)

      this.render = function() {
      domTarget
          .style('width', options.width + 'px')
          .style('height', options.height + 'px')
          .style('border', '1px solid #BDBDBD');

      svgTarget = domTarget
        .append('svg')
        .attr('class', 'genecluster-vis')
        .attr('width', options.width)
        .attr('height', options.height);

      svgTarget.call(zoomBehaviour);
      zoomBehaviour.on('zoom', this.update);

      svgTarget
        .append('g')
        .call(svgTopAxis);

      svgTarget.append('g')
        .call(svgCytoBands);
    };

    this.update = function() {
      svgTopAxis.update();
      svgCytoBands.update();
    }
  }

  return _constructor;
})();

module.exports = browser;


