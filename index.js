import outputLevel from './output-level';
import outputLUT from './output-lut';


export default class Envelope {

  constructor(config) {
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

  getADCurve() {
    if (this.attackDecayCurve) {
      return this.attackDecayCurve;
    }

    this._currentIndex = 0;

    const curve = [];
    let sameInARowCount = 0;
    let lastSeenValue = false;

    let maxLength = this.sampleRate * 60;
    while (curve.length < maxLength) {
      this._currentIndex++;

      if (this.state === 3) {
        break;
      }

      const nextValue = this.render();

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

  getReleaseCurve() {
    if (this.releaseCurve) {
      return this.releaseCurve;
    }

    this._currentIndex = 0;


    this.currentLevel = 0;
    this.levels[2] = Math.max.apply(Math, this.levels.slice(0, 3));
    this.advance(2);
    this.currentLevel = this.targetLevel;

    const curve = [];

    let sameInARowCount = 0;
    let lastSeenValue = false;

    let maxLength = this.sampleRate * 60;
    while (curve.length < maxLength) {
      this._currentIndex++;

      const nextValue = this.render();


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

  _getTickIncrement() {
    if (this.rising) {
      const newVal = this.decayIncrement * (2 + (this.targetLevel - this.currentLevel) / 256);
      return newVal;
    } else {
      return -1 * this.decayIncrement;
    }
  }

  render() {
    const newLevel = this.currentLevel + this._getTickIncrement();

    if (this.rising === (newLevel >= this.targetLevel)) {
      this.currentLevel = this.targetLevel;
      this.advance(this.state + 1);
    } else {
      this.currentLevel = newLevel;
    }

    return outputLUT[Math.floor(this.currentLevel)];
  }

  advance(newState) {
    this._points[newState] = this._currentIndex;

    this.state = newState;
    if (this.state === 4) {
      return;
    }

    const newLevel = this.levels[this.state];
    this.targetLevel = Math.max(0, (outputLevel[newLevel] << 5) - 224);
    this.rising = this.targetLevel > this.currentLevel;

    this.qr = Math.min(63, (this.rates[this.state] * 41) >> 6);
    this.decayIncrement = Math.pow(2, this.qr / 4) / 2048;
  }
}
