
var d3          = require('d3')
  , assign      = require('lodash.assign')

var ensemblsrc  = require('./ensembl-source.js')
  , utils       = require('./utils.js')
  , gAxis       = require('./genome-axis.js')

var GeneCluster = (function() {

  function _constructor(args) {

    var options = assign({
      //default options
      target : null,
      width : 1000,
      height : 400,
      specie : 'human',
      region : {
        chr: '1',
        start: '1',
        stop: '100000'
      }
    }, args);

    var domTarget = options.target ? d3.select(options.target) : d3.selection()
      , svgTarget = null

      , xscale = d3.scale.linear()
        .domain([options.region.start, options.region.stop])
        .range([0, options.width])

      , topAxis = gAxis()
        .height(options.height)
        .scale(xscale)

      , zoomBehaviour = d3.behavior.zoom()
        .x(xscale)
        .scaleExtent([1, 1000])


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
        .call(topAxis);
    };

    this.update = function() {
      topAxis.update();
    }
  }

  return _constructor;
})();

module.exports = GeneCluster;


