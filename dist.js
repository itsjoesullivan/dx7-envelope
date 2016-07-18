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
  function Envelope(context, config) {
    _classCallCheck(this, Envelope);

    this.levels = config.levels;
    this.rates = config.rates;
    this.currentLevel = 0;

    this.sampleRate = 49096;

    this.decayIncrement = 0;
    this.advance(0);

    this.getADCurve();
    this.getReleaseCurve();
  }

  _createClass(Envelope, [{
    key: 'getADCurve',
    value: function getADCurve() {
      if (this.attackDecayCurve) {
        return this.attackDecayCurve;
      }

      var curve = [];
      var sameInARowCount = 0;
      var lastSeenValue = false;

      var maxLength = this.sampleRate * 60;
      while (curve.length < maxLength) {

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

      this.currentLevel = 0;
      this.levels[2] = Math.max.apply(Math, this.levels.slice(0, 3));
      this.advance(2);
      this.currentLevel = this.targetLevel;

      var curve = [];

      var sameInARowCount = 0;
      var lastSeenValue = false;

      var maxLength = this.sampleRate * 60;
      while (curve.length < maxLength) {
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

},{"./output-level":2,"./output-lut":3}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = [0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127];

},{}],3:[function(require,module,exports){
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

},{}]},{},[1]);
