
var GeneManager = (function() {

  var _constructor = function() {
    this.db = [];
  };

  _constructor.prototype.findFreeTrack = function(uid, start, stop) {
    var trackNo = 0;
    var collide;
    for (var i = 0; i < this.db.length; i++) {
      collide = false;
      for (var j = 0; j < this.db[i].length; j++) {
        var gene = this.db[i][j];

        if (gene.uid === uid) {
          return trackNo;
        }

        if (gene.stop >= start && gene.start <= stop) {
          trackNo++;
          collide = true;
          break;
        }
      }
      if(!collide) {
        return trackNo;
      }
    }
    return trackNo;
  };

// Register a gene location
// Return its available track to display
  _constructor.prototype.register = function (gene) {

    if (gene.stop < gene.start) {
      gene.stop = [gene.start, gene.start = gene.stop][0];
    }

    var trackNo = this.findFreeTrack(gene.uid, gene.start, gene.stop);

    if (typeof this.db[trackNo] === 'undefined') {
      this.db[trackNo] = [];
    }
    this.db[trackNo].push(gene);

    return trackNo;
  };

  return _constructor;
})();

module.exports = GeneManager;
