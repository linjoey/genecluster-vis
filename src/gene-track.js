
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

  var genes;

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

          console.log('san',data);
          var genesGroup = _selection.selectAll('.gene')
            .data(data, function(d) { return d.$.uid })

          //update genes

          genes = genesGroup.enter()
            .append('g')
            .attr('class', 'gene')
            .append('rect')

            .attr('y', function(d) {
              return (20 * d.track) + 22
            })
            .attr('height', 20)
            .on('mouseover', function(d) {
              console.log(d.NomenclatureSymbol);
            })

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
    genes.attr('x', function (d) {
      return xscale(+d.ChrStart);
    })
      .attr('width', function (d) {
        var ginfo = d.GenomicInfo.GenomicInfoType;

        if (ginfo.ChrStart > ginfo.ChrStop) {
          return xscale(+ginfo.ChrStart) - xscale(+ginfo.ChrStop);
        } else {
          return xscale(+ginfo.ChrStop) - xscale(+ginfo.ChrStart);
        }
      })
  }

  _gt.locus = function(newChr, newStart, newStop) {
    _chr = newChr;
    _start = newStart;
    _stop = newStop;
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

