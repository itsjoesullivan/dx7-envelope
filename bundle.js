(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _outputLevel = require('./output-level');

var _outputLevel2 = _interopRequireDefault(_outputLevel);

var _outputLut = require('./output-lut');

var _outputLut2 = _interopRequireDefault(_outputLut);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Envelope = function () {
  function Envelope(config) {
    _classCallCheck(this, Envelope);

    this.levels = config.levels;
    this.rates = config.rates;
    this.currentLevel = 0;

    this.sampleRate = 49096;

    this.decayIncrement = 0;

    // for calculating breakpoints
    this._currentIndex = 0;
    this._points = {};

    this.advance(0);

    this.getADCurve();

    this.breakpoints = {};
    this.breakpoints[0] = (this._points[1] - this._points[0]) / this.sampleRate;
    this.breakpoints[1] = (this._points[2] - this._points[1]) / this.sampleRate;
    this.breakpoints[2] = (this._points[3] - this._points[2]) / this.sampleRate;

    this._points = {};
    this.getReleaseCurve();

    this.breakpoints[3] = (this._points[4] - this._points[3]) / this.sampleRate;
  }

  _createClass(Envelope, [{
    key: 'getADCurve',
    value: function getADCurve() {
      if (this.attackDecayCurve) {
        return this.attackDecayCurve;
      }

      this._currentIndex = 0;

      var curve = [];
      var sameInARowCount = 0;
      var lastSeenValue = false;

      var maxLength = this.sampleRate * 60;
      while (curve.length < maxLength) {
        this._currentIndex++;

        if (this.state === 3) {
          break;
        }

        var nextValue = this.render();

        if (lastSeenValue === nextValue) {
          sameInARowCount++;
        } else {
          sameInARowCount = 0;
        }
        lastSeenValue = nextValue;
        curve.push(nextValue);
        if (sameInARowCount > 44100 && curve.length > 1000) {
          break;
        }
      }
      this.attackDecayCurve = new Float32Array(curve.length);
      this.attackDecayCurve.set(curve);
      return curve;
    }
  }, {
    key: 'getReleaseCurve',
    value: function getReleaseCurve() {
      if (this.releaseCurve) {
        return this.releaseCurve;
      }

      this._currentIndex = 0;

      this.currentLevel = 0;
      this.levels[2] = Math.max.apply(Math, this.levels.slice(0, 3));
      this.advance(2);
      this.currentLevel = this.targetLevel;

      var curve = [];

      var sameInARowCount = 0;
      var lastSeenValue = false;

      var maxLength = this.sampleRate * 60;
      while (curve.length < maxLength) {
        this._currentIndex++;

        var nextValue = this.render();

        if (this.state === 4) {
          break;
        }

        if (this.state !== 3) {
          continue;
        }

        if (lastSeenValue === nextValue) {
          sameInARowCount++;
        } else {
          sameInARowCount = 0;
        }
        lastSeenValue = nextValue;

        curve.push(nextValue);

        // Normalize assuming we are going down
        curve[curve.length - 1] = curve[curve.length - 1] / curve[0];

        if (sameInARowCount > 44100 && curve.length > 1000) {
          break;
        }
      }

      this.releaseCurve = new Float32Array(curve.length);
      this.releaseCurve.set(curve);
      return curve;
    }
  }, {
    key: '_getTickIncrement',
    value: function _getTickIncrement() {
      if (this.rising) {
        var newVal = this.decayIncrement * (2 + (this.targetLevel - this.currentLevel) / 256);
        return newVal;
      } else {
        return -1 * this.decayIncrement;
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var newLevel = this.currentLevel + this._getTickIncrement();

      if (this.rising === newLevel >= this.targetLevel) {
        this.currentLevel = this.targetLevel;
        this.advance(this.state + 1);
      } else {
        this.currentLevel = newLevel;
      }

      return _outputLut2.default[Math.floor(this.currentLevel)];
    }
  }, {
    key: 'advance',
    value: function advance(newState) {
      this._points[newState] = this._currentIndex;

      this.state = newState;
      if (this.state === 4) {
        return;
      }

      var newLevel = this.levels[this.state];
      this.targetLevel = Math.max(0, (_outputLevel2.default[newLevel] << 5) - 224);
      this.rising = this.targetLevel > this.currentLevel;

      this.qr = Math.min(63, this.rates[this.state] * 41 >> 6);
      this.decayIncrement = Math.pow(2, this.qr / 4) / 2048;
    }
  }]);

  return Envelope;
}();

exports.default = Envelope;

},{"./output-level":5,"./output-lut":6}],2:[function(require,module,exports){
'use strict';

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

var _babar = require('babar');

var _babar2 = _interopRequireDefault(_babar);

var _index3 = require('../envelope-generator/index');

var _index4 = _interopRequireDefault(_index3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
var data = [];
for (var i = 0; i < env.attackDecayCurve.length; i += 44100 / 10) {
  data.push([
    data.length,
    Math.pow(env.attackDecayCurve[i], 1/4)
  ]);
}



console.log("##############  ATTACK  ##############");
console.log(babar(data, {
    color: 'green',
    width: 100,
    height: 10,
    yFractions: 1
}));


var data2 = [];
for (var i = 0; i < env.releaseCurve.length; i += 44100 / 10) {
  data2.push([
    data2.length,
    Math.pow(env.releaseCurve[i], 1/4)
  ]);
}

console.log("##############  RELEASE  ##############");
console.log(babar(data2, {
    color: 'cyan',
    width: 100,
    height: 10,
    yFractions: 1
}));
*/

var context = new AudioContext();
var dx7Env = new _index2.default({
  levels: [99, 75, 0, 0],
  rates: [50, 80, 10, 90]
});
var conf = {
  initialValueCurve: dx7Env.attackDecayCurve,
  releaseValueCurve: dx7Env.releaseCurve,
  sampleRate: dx7Env.sampleRate
};
var env = new _index4.default(context, conf);
/*
var env = new Envelope(context, {
  attackTime: 1
});
*/

var osc = context.createOscillator();
osc.type = 'sawtooth';
var gain = context.createGain();
gain.gain.value = 0;
osc.connect(gain);
env.connect(gain.gain);
gain.connect(context.destination);

document.getElementById('start').addEventListener('click', function () {
  osc.start(context.currentTime);
  env.start(context.currentTime);
});
document.getElementById('stop').addEventListener('click', function () {
  env.release(context.currentTime);
  var stopAt = env.getReleaseCompleteTime();
  console.log(stopAt);
  osc.stop(stopAt);
  env.stop(stopAt);
});

},{"../envelope-generator/index":7,"./index":1,"babar":3}],3:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var avgBkt, bucketize, createBkt, drawChart, drawRow, drawRowChart, drawRowLabel, minMax, minMaxBkt, normalizeBkt, pointsMinMaxUniqueX, roundToFixed, tc,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  tc = function(x, c) {
    return Array(x + 1).join(c);
  };

  minMax = function(min, max, val) {
    return Math.max(min, Math.min(max, val));
  };

  roundToFixed = function(val, fractions) {
    var m;
    m = Math.pow(10, fractions);
    return (Math.round(m * val) / m).toFixed(fractions);
  };

  pointsMinMaxUniqueX = function(points) {
    var maxX, maxY, minX, minY, valX, _ref;
    valX = [];
    _ref = points.reduce(function(prev, point) {
      var _ref;
      if (_ref = point[0], __indexOf.call(valX, _ref) < 0) {
        valX.push(point[0]);
      }
      return [Math.min(prev[0], point[0]), Math.max(prev[1], point[0]), Math.min(prev[2], point[1]), Math.max(prev[3], point[1])];
    }, [Infinity, -Infinity, Infinity, -Infinity]), minX = _ref[0], maxX = _ref[1], minY = _ref[2], maxY = _ref[3];
    return {
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      uniqueX: valX.length
    };
  };

  drawRowLabel = function(r, lblY, lblYW) {
    var lbl;
    lbl = r === 0 || lblY[r] !== lblY[r - 1] ? lblY[r] : '';
    return "" + (tc(lblYW - lbl.length - 1, ' ')) + lbl;
  };

  drawRowChart = function(r, bkt, bktW, c, h) {
    var v;
    return ((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = bkt.length; _i < _len; _i++) {
        v = bkt[_i];
        switch (((r > v) && 1) || (((r > v - 1 || r === v) || r === h - 1) && 2) || 3) {
          case 1:
            if (c === 'ascii') {
              _results.push(tc(bktW, ' '));
            } else {
              _results.push(tc(bktW, '_'.black));
            }
            break;
          case 2:
            if (c === 'ascii') {
              _results.push(tc(bktW, ' '));
            } else {
              _results.push(tc(Math.max(1, bktW - 1), '_'[c]) + (bktW > 1 ? '_'.black : ''));
            }
            break;
          case 3:
            if (c === 'ascii') {
              _results.push(tc(bktW, 'X'));
            } else {
              _results.push(tc(Math.max(1, bktW - 1), ' '[c].inverse) + (bktW > 1 ? '_'.black : ''));
            }
            break;
          default:
            _results.push(void 0);
        }
      }
      return _results;
    })()).join('');
  };

  drawRow = function(r, lblY, lblYW, bkt, bktW, c, h) {
    return "" + (drawRowLabel(r, lblY, lblYW)) + " " + (drawRowChart(r, bkt, bktW, c, h));
  };

  drawChart = function(h, lblY, lblYW, bkt, bktW, c) {
    var r;
    return ((function() {
      var _i, _ref, _results;
      _results = [];
      for (r = _i = _ref = h - 1; _ref <= 0 ? _i <= 0 : _i >= 0; r = _ref <= 0 ? ++_i : --_i) {
        _results.push(drawRow(r, lblY, lblYW, bkt, bktW, c, h));
      }
      return _results;
    })()).join('\n');
  };

  createBkt = function(points, numBkts, minX, diffX) {
    var bkt, i, p, u, x, y, _i, _j, _len, _ref;
    bkt = [];
    for (_i = 0, _len = points.length; _i < _len; _i++) {
      p = points[_i];
      x = p[0], y = p[1];
      u = Math.min(numBkts - 1, Math.floor((x - minX) / diffX * numBkts));
      if (bkt[u] == null) {
        bkt[u] = [];
      }
      bkt[u].push(p);
    }
    for (i = _j = 0, _ref = bkt.length; 0 <= _ref ? _j < _ref : _j > _ref; i = 0 <= _ref ? ++_j : --_j) {
      if (!bkt[i]) {
        bkt[i] = [];
      }
    }
    return bkt;
  };

  avgBkt = function(bkt) {
    var prev, values, _i, _len, _results;
    prev = 0;
    _results = [];
    for (_i = 0, _len = bkt.length; _i < _len; _i++) {
      values = bkt[_i];
      if (values.length) {
        _results.push(prev = 1 / values.length * values.reduce(function(prev, curr) {
          return prev + curr[1];
        }, 0));
      } else {
        _results.push(prev);
      }
    }
    return _results;
  };

  minMaxBkt = function(bkt) {
    return {
      min: Math.min.apply(null, bkt),
      max: Math.max.apply(null, bkt)
    };
  };

  normalizeBkt = function(bkt, min, diff, h) {
    var v, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = bkt.length; _i < _len; _i++) {
      v = bkt[_i];
      _results.push((v - min) / diff * h);
    }
    return _results;
  };

  bucketize = function(points, numBkts, minX, diffX, h) {
    var bkt, diff, max, min, _ref;
    bkt = avgBkt(createBkt(points, numBkts, minX, diffX));
    _ref = minMaxBkt(bkt), min = _ref.min, max = _ref.max;
    diff = max - min;
    return {
      bkt: normalizeBkt(bkt, min, diff, h),
      min: min,
      max: max,
      diff: diff
    };
  };

  module.exports = function(points, options) {
    var bkt, bktW, caption, color, diff, diffX, diffY, height, lbl, lblXI, lblXN, lblXW, lblY, lblYW, max, maxX, maxY, min, minX, minY, numBkts, out, u, uniqueX, v, width, x, xFractions, yFractions, _i, _j, _k, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
    if (options == null) {
      options = {};
    }
    _ref3 = [options.caption, (_ref = options.color) != null ? _ref : 'cyan', (_ref1 = options.width) != null ? _ref1 : 80, (_ref2 = options.height) != null ? _ref2 : 15, options.xFractions, options.yFractions], caption = _ref3[0], color = _ref3[1], width = _ref3[2], height = _ref3[3], xFractions = _ref3[4], yFractions = _ref3[5];
    if (color !== 'ascii') {
      require('colors');
    }
    _ref4 = pointsMinMaxUniqueX(points), minX = _ref4.minX, maxX = _ref4.maxX, minY = _ref4.minY, maxY = _ref4.maxY, uniqueX = _ref4.uniqueX;
    _ref5 = [maxX - minX, maxY - minY], diffX = _ref5[0], diffY = _ref5[1];
    height -= 1 + !!caption;
    if (yFractions == null) {
      yFractions = minMax(0, 8, Math.log(height / diffY * 5) / Math.LN10);
    }
    lblYW = 1 + Math.max(roundToFixed(minY, yFractions).length, roundToFixed(maxY, yFractions).length);
    width -= lblYW;
    numBkts = Math.min(uniqueX, width - lblYW);
    bktW = Math.floor((width - lblYW) / numBkts);
    if (xFractions == null) {
      xFractions = minMax(0, 8, Math.log(numBkts / diffX * 5) / Math.LN10);
    }
    _ref6 = bucketize(points, numBkts, minX, diffX, height), bkt = _ref6.bkt, min = _ref6.min, max = _ref6.max, diff = _ref6.diff;
    lblY = [];
    for (v = _i = _ref7 = height - 1; _ref7 <= 0 ? _i <= 0 : _i >= 0; v = _ref7 <= 0 ? ++_i : --_i) {
      lbl = roundToFixed(min + diff * v / (height - 1), yFractions);
      lblY.unshift(lbl);
    }
    lblXW = 0;
    for (u = _j = 0; 0 <= numBkts ? _j < numBkts : _j > numBkts; u = 0 <= numBkts ? ++_j : --_j) {
      lbl = roundToFixed(minX + u * diffX / (numBkts - 1), xFractions);
      lblXW = Math.max(lblXW, lbl.length);
    }
    lblXN = numBkts;
    lblXI = 1;
    while (lblXN * lblXW >= numBkts * bktW) {
      lblXN = Math.floor(lblXN / 2);
      lblXI *= 2;
    }
    out = '';
    if (caption != null) {
      out += tc(lblYW, ' ');
      out += color === 'ascii' ? caption : caption.bold;
      out += '\n';
    }
    out += drawChart(height, lblY, lblYW, bkt, bktW, color) + '\n';
    out += tc(lblYW, ' ');
    for (x = _k = 0; 0 <= lblXN ? _k < lblXN : _k > lblXN; x = 0 <= lblXN ? ++_k : --_k) {
      u = x * lblXI;
      lbl = roundToFixed(minX + u * diffX / (numBkts - 1), xFractions);
      out += lbl;
      out += tc(bktW * lblXI - lbl.length, ' ');
    }
    return out;
  };

}).call(this);

},{"colors":4}],4:[function(require,module,exports){
/*
colors.js

Copyright (c) 2010

Marak Squires
Alexis Sellier (cloudhead)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var isHeadless = false;

if (typeof module !== 'undefined') {
  isHeadless = true;
}

if (!isHeadless) {
  var exports = {};
  var module = {};
  var colors = exports;
  exports.mode = "browser";
} else {
  exports.mode = "console";
}

//
// Prototypes the string object to have additional method calls that add terminal colors
//
var addProperty = function (color, func) {
  exports[color] = function (str) {
    return func.apply(str);
  };
  String.prototype.__defineGetter__(color, func);
};

function stylize(str, style) {

  var styles;

  if (exports.mode === 'console') {
    styles = {
      //styles
      'bold'      : ['\x1B[1m',  '\x1B[22m'],
      'italic'    : ['\x1B[3m',  '\x1B[23m'],
      'underline' : ['\x1B[4m',  '\x1B[24m'],
      'inverse'   : ['\x1B[7m',  '\x1B[27m'],
      'strikethrough' : ['\x1B[9m',  '\x1B[29m'],
      //text colors
      //grayscale
      'white'     : ['\x1B[37m', '\x1B[39m'],
      'grey'      : ['\x1B[90m', '\x1B[39m'],
      'black'     : ['\x1B[30m', '\x1B[39m'],
      //colors
      'blue'      : ['\x1B[34m', '\x1B[39m'],
      'cyan'      : ['\x1B[36m', '\x1B[39m'],
      'green'     : ['\x1B[32m', '\x1B[39m'],
      'magenta'   : ['\x1B[35m', '\x1B[39m'],
      'red'       : ['\x1B[31m', '\x1B[39m'],
      'yellow'    : ['\x1B[33m', '\x1B[39m'],
      //background colors
      //grayscale
      'whiteBG'     : ['\x1B[47m', '\x1B[49m'],
      'greyBG'      : ['\x1B[49;5;8m', '\x1B[49m'],
      'blackBG'     : ['\x1B[40m', '\x1B[49m'],
      //colors
      'blueBG'      : ['\x1B[44m', '\x1B[49m'],
      'cyanBG'      : ['\x1B[46m', '\x1B[49m'],
      'greenBG'     : ['\x1B[42m', '\x1B[49m'],
      'magentaBG'   : ['\x1B[45m', '\x1B[49m'],
      'redBG'       : ['\x1B[41m', '\x1B[49m'],
      'yellowBG'    : ['\x1B[43m', '\x1B[49m']
    };
  } else if (exports.mode === 'browser') {
    styles = {
      //styles
      'bold'      : ['<b>',  '</b>'],
      'italic'    : ['<i>',  '</i>'],
      'underline' : ['<u>',  '</u>'],
      'inverse'   : ['<span style="background-color:black;color:white;">',  '</span>'],
      'strikethrough' : ['<del>',  '</del>'],
      //text colors
      //grayscale
      'white'     : ['<span style="color:white;">',   '</span>'],
      'grey'      : ['<span style="color:gray;">',    '</span>'],
      'black'     : ['<span style="color:black;">',   '</span>'],
      //colors
      'blue'      : ['<span style="color:blue;">',    '</span>'],
      'cyan'      : ['<span style="color:cyan;">',    '</span>'],
      'green'     : ['<span style="color:green;">',   '</span>'],
      'magenta'   : ['<span style="color:magenta;">', '</span>'],
      'red'       : ['<span style="color:red;">',     '</span>'],
      'yellow'    : ['<span style="color:yellow;">',  '</span>'],
      //background colors
      //grayscale
      'whiteBG'     : ['<span style="background-color:white;">',   '</span>'],
      'greyBG'      : ['<span style="background-color:gray;">',    '</span>'],
      'blackBG'     : ['<span style="background-color:black;">',   '</span>'],
      //colors
      'blueBG'      : ['<span style="background-color:blue;">',    '</span>'],
      'cyanBG'      : ['<span style="background-color:cyan;">',    '</span>'],
      'greenBG'     : ['<span style="background-color:green;">',   '</span>'],
      'magentaBG'   : ['<span style="background-color:magenta;">', '</span>'],
      'redBG'       : ['<span style="background-color:red;">',     '</span>'],
      'yellowBG'    : ['<span style="background-color:yellow;">',  '</span>']
    };
  } else if (exports.mode === 'none') {
    return str + '';
  } else {
    console.log('unsupported mode, try "browser", "console" or "none"');
  }
  return styles[style][0] + str + styles[style][1];
}

function applyTheme(theme) {

  //
  // Remark: This is a list of methods that exist
  // on String that you should not overwrite.
  //
  var stringPrototypeBlacklist = [
    '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__', 'charAt', 'constructor',
    'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf', 'charCodeAt',
    'indexOf', 'lastIndexof', 'length', 'localeCompare', 'match', 'replace', 'search', 'slice', 'split', 'substring',
    'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toUpperCase', 'trim', 'trimLeft', 'trimRight'
  ];

  Object.keys(theme).forEach(function (prop) {
    if (stringPrototypeBlacklist.indexOf(prop) !== -1) {
      console.log('warn: '.red + ('String.prototype' + prop).magenta + ' is probably something you don\'t want to override. Ignoring style name');
    }
    else {
      if (typeof(theme[prop]) === 'string') {
        addProperty(prop, function () {
          return exports[theme[prop]](this);
        });
      }
      else {
        addProperty(prop, function () {
          var ret = this;
          for (var t = 0; t < theme[prop].length; t++) {
            ret = exports[theme[prop][t]](ret);
          }
          return ret;
        });
      }
    }
  });
}


//
// Iterate through all default styles and colors
//
var x = ['bold', 'underline', 'strikethrough', 'italic', 'inverse', 'grey', 'black', 'yellow', 'red', 'green', 'blue', 'white', 'cyan', 'magenta', 'greyBG', 'blackBG', 'yellowBG', 'redBG', 'greenBG', 'blueBG', 'whiteBG', 'cyanBG', 'magentaBG'];
x.forEach(function (style) {

  // __defineGetter__ at the least works in more browsers
  // http://robertnyman.com/javascript/javascript-getters-setters.html
  // Object.defineProperty only works in Chrome
  addProperty(style, function () {
    return stylize(this, style);
  });
});

function sequencer(map) {
  return function () {
    if (!isHeadless) {
      return this.replace(/( )/, '$1');
    }
    var exploded = this.split(""), i = 0;
    exploded = exploded.map(map);
    return exploded.join("");
  };
}

var rainbowMap = (function () {
  var rainbowColors = ['red', 'yellow', 'green', 'blue', 'magenta']; //RoY G BiV
  return function (letter, i, exploded) {
    if (letter === " ") {
      return letter;
    } else {
      return stylize(letter, rainbowColors[i++ % rainbowColors.length]);
    }
  };
})();

exports.themes = {};

exports.addSequencer = function (name, map) {
  addProperty(name, sequencer(map));
};

exports.addSequencer('rainbow', rainbowMap);
exports.addSequencer('zebra', function (letter, i, exploded) {
  return i % 2 === 0 ? letter : letter.inverse;
});

exports.setTheme = function (theme) {
  if (typeof theme === 'string') {
    try {
      exports.themes[theme] = require(theme);
      applyTheme(exports.themes[theme]);
      return exports.themes[theme];
    } catch (err) {
      console.log(err);
      return err;
    }
  } else {
    applyTheme(theme);
  }
};


addProperty('stripColors', function () {
  return ("" + this).replace(/\x1B\[\d+m/g, '');
});

// please no
function zalgo(text, options) {
  var soul = {
    "up" : [
      '̍', '̎', '̄', '̅',
      '̿', '̑', '̆', '̐',
      '͒', '͗', '͑', '̇',
      '̈', '̊', '͂', '̓',
      '̈', '͊', '͋', '͌',
      '̃', '̂', '̌', '͐',
      '̀', '́', '̋', '̏',
      '̒', '̓', '̔', '̽',
      '̉', 'ͣ', 'ͤ', 'ͥ',
      'ͦ', 'ͧ', 'ͨ', 'ͩ',
      'ͪ', 'ͫ', 'ͬ', 'ͭ',
      'ͮ', 'ͯ', '̾', '͛',
      '͆', '̚'
    ],
    "down" : [
      '̖', '̗', '̘', '̙',
      '̜', '̝', '̞', '̟',
      '̠', '̤', '̥', '̦',
      '̩', '̪', '̫', '̬',
      '̭', '̮', '̯', '̰',
      '̱', '̲', '̳', '̹',
      '̺', '̻', '̼', 'ͅ',
      '͇', '͈', '͉', '͍',
      '͎', '͓', '͔', '͕',
      '͖', '͙', '͚', '̣'
    ],
    "mid" : [
      '̕', '̛', '̀', '́',
      '͘', '̡', '̢', '̧',
      '̨', '̴', '̵', '̶',
      '͜', '͝', '͞',
      '͟', '͠', '͢', '̸',
      '̷', '͡', ' ҉'
    ]
  },
  all = [].concat(soul.up, soul.down, soul.mid),
  zalgo = {};

  function randomNumber(range) {
    var r = Math.floor(Math.random() * range);
    return r;
  }

  function is_char(character) {
    var bool = false;
    all.filter(function (i) {
      bool = (i === character);
    });
    return bool;
  }

  function heComes(text, options) {
    var result = '', counts, l;
    options = options || {};
    options["up"] = options["up"] || true;
    options["mid"] = options["mid"] || true;
    options["down"] = options["down"] || true;
    options["size"] = options["size"] || "maxi";
    text = text.split('');
    for (l in text) {
      if (is_char(l)) {
        continue;
      }
      result = result + text[l];
      counts = {"up" : 0, "down" : 0, "mid" : 0};
      switch (options.size) {
      case 'mini':
        counts.up = randomNumber(8);
        counts.min = randomNumber(2);
        counts.down = randomNumber(8);
        break;
      case 'maxi':
        counts.up = randomNumber(16) + 3;
        counts.min = randomNumber(4) + 1;
        counts.down = randomNumber(64) + 3;
        break;
      default:
        counts.up = randomNumber(8) + 1;
        counts.mid = randomNumber(6) / 2;
        counts.down = randomNumber(8) + 1;
        break;
      }

      var arr = ["up", "mid", "down"];
      for (var d in arr) {
        var index = arr[d];
        for (var i = 0 ; i <= counts[index]; i++) {
          if (options[index]) {
            result = result + soul[index][randomNumber(soul[index].length)];
          }
        }
      }
    }
    return result;
  }
  return heComes(text);
}


// don't summon zalgo
addProperty('zalgo', function () {
  return zalgo(this);
});

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = [0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127];

},{}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var outputLUT = [];

// todo: make lazy

for (var i = 0; i < 4096; i++) {
  var dB = (i - 3824) * 0.0235;
  outputLUT[i] = Math.pow(20, dB / 20);
}

exports.default = outputLUT;

},{}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Create an envelope generator that
 * can be attached to an AudioParam
 */

var Envelope = function () {
  function Envelope(context, settings) {
    _classCallCheck(this, Envelope);

    // Hold on to these
    this.context = context;
    this.settings = settings;

    this._setDefaults();

    // Create nodes
    this.source = this._getOnesBufferSource();
    this.attackDecayNode = context.createGain();
    this.releaseNode = context.createGain();
    this.ampNode = context.createGain();
    this.outputNode = context.createGain();

    this.outputNode.gain.value = this.settings.startLevel;
    this.ampNode.gain.value = this.settings.maxLevel - this.settings.startLevel;

    // Set up graph
    this.source.connect(this.attackDecayNode);
    this.source.connect(this.outputNode);
    this.attackDecayNode.connect(this.releaseNode);
    this.releaseNode.connect(this.ampNode);
    this.ampNode.connect(this.outputNode.gain);
  }

  /**
   * Deal w/ settings object
   */


  _createClass(Envelope, [{
    key: '_setDefaults',
    value: function _setDefaults() {

      // curve
      if (typeof this.settings.curve !== 'string') {
        this.settings.curve = 'linear';
      }

      // delayTime
      if (typeof this.settings.delayTime !== 'number') {
        this.settings.delayTime = 0;
      }

      // startLevel
      if (typeof this.settings.startLevel !== 'number') {
        this.settings.startLevel = 0;
      }
      // maxLevel
      if (typeof this.settings.maxLevel !== 'number') {
        this.settings.maxLevel = 1;
      }

      // sustainLevel
      if (typeof this.settings.sustainLevel !== 'number') {
        this.settings.sustainLevel = 1;
      }

      // attackTime
      if (typeof this.settings.attackTime !== 'number') {
        this.settings.attackTime = 0;
      }

      // holdTime
      if (typeof this.settings.holdTime !== 'number') {
        this.settings.holdTime = 0;
      }

      // decayTime
      if (typeof this.settings.decayTime !== 'number') {
        this.settings.decayTime = 0;
      }

      // releaseTime
      if (typeof this.settings.releaseTime !== 'number') {
        this.settings.releaseTime = 0;
      }

      // startLevel must not be zero if attack curve is exponential
      if (this.settings.startLevel === 0 && this._getRampMethodName('attack') === 'exponentialRampToValueAtTime') {
        if (this.settings.maxLevel < 0) {
          this.settings.startLevel = -0.001;
        } else {
          this.settings.startLevel = 0.001;
        }
      }

      // maxLevel must not be zero if attack, decay, or release curve is exponential
      if (this.settings.maxLevel === 0 && (this._getRampMethodName('attack') === 'exponentialRampToValueAtTime' || this._getRampMethodName('decay') === 'exponentialRampToValueAtTime' || this._getRampMethodName('release') === 'exponentialRampToValueAtTime')) {
        if (this.settings.startLevel < 0) {
          this.settings.maxLevel = -0.001;
        } else {
          this.settings.maxLevel = 0.001;
        }
      }

      // sustainLevel must not be zero if decay or release curve is exponential
      if (this.settings.sustainLevel === 0 && (this._getRampMethodName('decay') === 'exponentialRampToValueAtTime' || this._getRampMethodName('release') === 'exponentialRampToValueAtTime')) {
        // No need to be negative here as it's a multiplier
        this.settings.sustainLevel = 0.001;
      }

      // decayTime must not be zero to avoid colliding with attack curve events
      if (this.settings.decayTime === 0) {

        this.settings.decayTime = 0.001;
      }
    }

    /**
     * Get an audio source that will be pegged at 1,
     * providing a signal through our path that can
     * drive the AudioParam this is attached to.
     * TODO: Can we always cache this?
     */

  }, {
    key: '_getOnesBufferSource',
    value: function _getOnesBufferSource() {
      var context = this.context;

      // Generate buffer, setting its samples to 1
      // Needs to be 2 for safari!
      // Hat tip to https://github.com/mmckegg/adsr
      var onesBuffer = context.createBuffer(1, 2, context.sampleRate);
      var data = onesBuffer.getChannelData(0);
      data[0] = 1;
      data[1] = 1;

      // Create a source for the buffer, looping it
      var source = context.createBufferSource();
      source.buffer = onesBuffer;
      source.loop = true;

      return source;
    }

    /**
     * Connect the end of the path to the
     * targetParam.
     *
     * TODO: Throw error when not an AudioParam target?
     */

  }, {
    key: 'connect',
    value: function connect(targetParam) {
      this.outputNode.connect(targetParam);
    }

    /**
     * Begin the envelope, scheduling everything we know
     * (attack time, decay time, sustain level).
     */

  }, {
    key: 'start',
    value: function start(when) {
      if (this.settings.initialValueCurve) {
        var initial = this.settings.initialValueCurve;
        var duration = initial.length * this.settings.sampleRate;
        this.attackDecayNode.gain.setValueCurveAtTime(initial, when, initial.length / this.settings.sampleRate);
      } else {
        var attackRampMethodName = this._getRampMethodName('attack');
        var decayRampMethodName = this._getRampMethodName('decay');

        var attackStartsAt = when + this.settings.delayTime;
        var attackEndsAt = attackStartsAt + this.settings.attackTime;
        var decayStartsAt = attackEndsAt + this.settings.holdTime;
        var decayEndsAt = decayStartsAt + this.settings.decayTime;

        var attackStartLevel = 0;
        if (attackRampMethodName === "exponentialRampToValueAtTime") {
          attackStartLevel = 0.001;
        }

        this.attackDecayNode.gain.setValueAtTime(attackStartLevel, when);
        this.attackDecayNode.gain.setValueAtTime(attackStartLevel, attackStartsAt);
        this.attackDecayNode.gain[attackRampMethodName](1, attackEndsAt);
        this.attackDecayNode.gain.setValueAtTime(1, decayStartsAt);
        this.attackDecayNode.gain[decayRampMethodName](this.settings.sustainLevel, decayEndsAt);
      }

      this.source.start(when);
    }

    /**
     * Return  either linear or exponential
     * ramp method names based on a general
     * 'curve' setting, which is overridden
     * on a per-stage basis by 'attackCurve',
     * 'decayCurve', and 'releaseCurve',
     * all of which can be set to values of
     * either 'linear' or 'exponential'.
     */

  }, {
    key: '_getRampMethodName',
    value: function _getRampMethodName(stage) {
      var exponential = 'exponentialRampToValueAtTime';
      var linear = 'linearRampToValueAtTime';

      // Handle general case
      var generalRampMethodName = linear;
      if (this.settings.curve === 'exponential') {
        generalRampMethodName = exponential;
      }

      switch (stage) {
        case 'attack':
          if (this.settings.attackCurve) {
            if (this.settings.attackCurve === 'exponential') {
              return exponential;
            } else if (this.settings.attackCurve === 'linear') {
              return linear;
            }
          }
          break;
        case 'decay':
          if (this.settings.decayCurve) {
            if (this.settings.decayCurve === 'exponential') {
              return exponential;
            } else if (this.settings.decayCurve === 'linear') {
              return linear;
            }
          }
          break;
        case 'release':
          if (this.settings.releaseCurve) {
            if (this.settings.releaseCurve === 'exponential') {
              return exponential;
            } else if (this.settings.releaseCurve === 'linear') {
              return linear;
            }
          }
          break;
        default:
          break;
      }
      return generalRampMethodName;
    }

    /**
     * End the envelope, scheduling what we didn't know before
     * (release time)
     */

  }, {
    key: 'release',
    value: function release(when) {
      this.releasedAt = when;

      if (this.settings.releaseValueCurve) {
        var release = this.settings.releaseValueCurve;
        var duration = release.length / this.settings.sampleRate;
        this.releaseNode.gain.setValueCurveAtTime(release, when, duration);
        this.settings.releaseTime = duration;
      } else {
        var releaseEndsAt = this.releasedAt + this.settings.releaseTime;

        var rampMethodName = this._getRampMethodName('release');

        var releaseTargetLevel = 0;

        if (rampMethodName === "exponentialRampToValueAtTime") {
          releaseTargetLevel = 0.001;
        }

        this.releaseNode.gain.setValueAtTime(1, when);
        this.releaseNode.gain[rampMethodName](releaseTargetLevel, releaseEndsAt);
      }
    }
  }, {
    key: 'stop',
    value: function stop(when) {
      this.source.stop(when);
    }

    /**
     * Provide a helper for consumers to
     * know when the release is finished,
     * so that a source can be stopped.
     */

  }, {
    key: 'getReleaseCompleteTime',
    value: function getReleaseCompleteTime() {
      if (typeof this.releasedAt !== 'number') {
        throw new Error("Release has not been called.");
      }
      return this.releasedAt + this.settings.releaseTime;
    }
  }]);

  return Envelope;
}();

module.exports = Envelope;

},{}]},{},[2]);
