
var d3 = require('d3');
var eutils = require('ncbi-eutils');
var GeneManager = require('./gene-manager.js');

var genetrack = function(xscale) {

  var _specie = 'human'
    , _chr = '1'
    , _start = '1'
    , _stop  = '100000'
    , _bufferedStart = _start
    , _bufferedStop = _stop
    , _geneSummaryManager = new GeneManager()
    , _selection;

  var genesGroup;
  var outGenes;

  var _gt = function(selection) {

    if (selection !== undefined) {
      _selection = selection;

      drawGeneSummariesAt(_start, _stop);
    }

    return _gt;
  };

  function drawGeneSummariesAt(start, stop) {
    var q = _chr + "[CHR] AND " + start + "[CPOS]:" + stop + "[CPOS] AND " + _specie + "[ORGN]";
    return eutils.esearch({db:'gene', term: q})
      .then(eutils.esummary)
      .then(function(data) {

        if ((typeof data.eSummaryResult.ERROR !== 'undefined')) {
          return
        }

        data = data.eSummaryResult.DocumentSummarySet.DocumentSummary;
        if (data.constructor === Array) {
          for (var i = 0; i < data.length; i++) {
            var trackNum = _geneSummaryManager
              .register({
                start: +data[i].GenomicInfo.GenomicInfoType.ChrStart,
                stop: +data[i].GenomicInfo.GenomicInfoType.ChrStop
              });

            data[i].track = trackNum;
          }

          genesGroup = _selection.selectAll('.gene')
            .data(data, function(d) { return d.$.uid })

          var genesEnter = genesGroup.enter()
            .append('g')
            .attr('class', 'gene');

            genesEnter.append('rect')
            .attr('y', function(d) {
              return (20 * d.track) + 20;
            })
            .attr('height', 10)

          genesEnter.append('title')
            .text(function(d) {return d.Name; })

          outGenes = genesGroup.exit();

          _gt.update();

        } else {
          //single element

        }
      })
      .catch(function(reason) {
        console.log(reason);
        throw new Error('genecluster-vis Data retrieval Error');
      });
  }


  _gt.update = function() {

    function applyUpdate() {
      this.select('rect')
        .attr('x', function (d) {
          return xscale(+d.ChrStart);
        }).attr('width', function (d) {
          var ginfo = d.GenomicInfo.GenomicInfoType;

          if (ginfo.ChrStart > ginfo.ChrStop) {
            return xscale(+ginfo.ChrStart) - xscale(+ginfo.ChrStop);
          } else {
            return xscale(+ginfo.ChrStop) - xscale(+ginfo.ChrStart);
          }
        })
    }

    applyUpdate.call(genesGroup)
    applyUpdate.call(outGenes)
  }

  _gt.updateend = function() {
    var ext = xscale.domain();

    //dont make request on old areas or zooming in
    if (ext[0] < _bufferedStart || ext[1] > _bufferedStop) {
      var start = ext[0] < _bufferedStart ? ext[0] : _bufferedStart;
      var stop = ext[1] > _bufferedStop ? ext[1] : _bufferedStop;

      _bufferedStart = start;
      _bufferedStop = stop;

      drawGeneSummariesAt(start, stop);
    }
  };

  _gt.locus = function(newChr, newStart, newStop) {
    _chr = newChr;
    _bufferedStart = _start = newStart;
    _bufferedStop = _stop = newStop;
    return _gt;
  };

  _gt.specie = function(arg) {
    if (arg) {
      _specie = arg;
      return _gt;
    } else {
      return _gt;
    }
  };

  return _gt;
};

module.exports = genetrack;

