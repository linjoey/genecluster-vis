
var d3          = require('d3')
  , assign      = require('lodash.assign')

var ensemblsrc  = require('./ensembl-source.js')
  , utils       = require('./utils.js')
  , gAxis        = require('./genome-axis.js')

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

      var zoomBehaviour = d3.behavior.zoom()
        .x(xscale)
        .scaleExtent([1, 1000]);

      zoomBehaviour.on('zoom', zoom);

      var container = svgTarget.append('g')
      svgTarget.call(zoomBehaviour);

      var rect = container.append('rect')
        .datum({start: 5000, stop:20000})
        .attr('height', 10)
        .attr('y', 30)

      updateRect();

      function updateRect() {
        rect.attr('width', function(d) {
          return xscale(d.stop) - xscale(d.start);
        })
          .attr('x', function(d) {
            return xscale(d.start);
          })

      }

      var topAxis = gAxis()
        .height(options.height)
        .scale(xscale);

      var axisG = svgTarget
        .append('g')
        .call(topAxis);
      console.log('nah', xscale.domain())
      console.log(zoomBehaviour.translate())
      function zoom () {
        console.log(zoomBehaviour.translate())
        if (xscale.domain()[0] > -5000) {
          updateRect()
          topAxis.update();
          console.log('nah', xscale.domain())

        } else {
          console.log('nah', xscale.domain())
        }

      }

    }
  }

  return _constructor;
})();

module.exports = GeneCluster;


