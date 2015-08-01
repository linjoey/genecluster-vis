
var d3         = require('d3')
  , assign     = require('lodash.assign');

var bAxis      = require('./browser-axis.js')
  , bBands     = require('./browser-bands.js')
  , genesTrack = require('../gene-track.js')

var browser = (function() {
  function _constructor(args) {
    var _this = this;
    var options = assign({
      //default options
      target : null,
      width : 1200,
      height : 250,
      specie : 'human',
      region : {
        segment: '17',
        start: '7658401',
        stop: '7697549'
      }
    }, args);

    var domTarget = options.target ? d3.select(options.target) : d3.selection()
      , yOffset = 25
      , svgTarget = null

      , xscale = d3.scale.linear()
        .domain([+options.region.start, +options.region.stop])
        .range([0, options.width])

      , svgTopAxis = bAxis()
        .height(options.height)
        .offset([0, yOffset])
        .scale(xscale)

      , zoomBehaviour = d3.behavior.zoom()
        .x(xscale)
        .scaleExtent([0.5, 50])

      , svgCytoBands = bBands(undefined, options.width)
        .scale(xscale)
        .offset([0, yOffset + 1])
        .segment(options.region.segment)

      , svgGenes = genesTrack(xscale)
        .locus(options.region.segment, options.region.start, options.region.stop);

    _this.render = function () {
      domTarget
        .style('width', options.width + 'px')
        .style('height', options.height + 'px')
        .style('border', '1px solid #BDBDBD');

      svgTarget = domTarget
        .append('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('class', 'genecluster-vis')
        .attr('width', options.width)
        .attr('height', options.height);

      svgTarget.call(zoomBehaviour);
      zoomBehaviour.on('zoom', _this.update);
      zoomBehaviour.on('zoomend', _this.updateend)

      svgTarget
        .append('g')
        .call(svgTopAxis);

      svgTarget.append('g')
        .call(svgCytoBands);

      svgTarget.append('g')
        .attr('transform', "translate(0," + (yOffset + 24) + ")")
        .call(svgGenes);
    };

    _this.update = function () {
      svgTopAxis.update();
      svgCytoBands.update();
      svgGenes.update();
    };

    _this.updateend = function() {
      svgGenes.updateend();
    }
  }

  return _constructor;
})();

module.exports = browser;


