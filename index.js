import outputLevel from './output-level';
import outputLUT from './output-lut';


export default class Envelope {
  constructor(context, config) {
    this.levels = config.levels;
    this.rates = config.rates;
    this.currentLevel = 0;

    this.maxLevel = 0;

    // noteOff has been called?
    this.down = true;

    this.decayIncrement = 0;
    this.advance(0);
  }

  getADCurve() {
    console.log('getADCurve');
    const curve = [];
    var sameInARowCount = 0;
    var lastSeenValue = false;
    while (curve.length < 100000) {
      var nextValue = this.render();

      if (lastSeenValue === nextValue) {
        sameInARowCount++;
      } else {
        sameInARowCount = 0;
      }
      lastSeenValue = nextValue;
      curve.push(nextValue);
      if (sameInARowCount > 3 && curve.length > 10) {
        break;
      }
    }
    this.attackDecayCurve = curve;
    return curve;
  }

  getReleaseCurve() {
    console.log('getReleaseCurve');

    this.advance(3);
    this.rising = false;
    this._targetMet = (level) => {
      return level >= this.targetLevel;
    };

    const curve = [];

    var sameInARowCount = 0;
    var lastSeenValue = false;

    while (curve.length < 10000) {
      var nextValue = this.render();
      if (typeof nextValue !== 'number') {
        break;
      }

      if (lastSeenValue === nextValue) {
        sameInARowCount++;
      } else {
        sameInARowCount = 0;
      }
      lastSeenValue = nextValue;

      curve.push(nextValue);
      if (sameInARowCount > 3 && curve.length > 10) {
        break;
      }
    }
    this.releaseCurve = curve;
    return curve;
  }

  _getTickIncrement() {
    if (this.rising) {
      const newVal = this.decayIncrement * (2 + (this.targetLevel - this.currentLevel) / 256);
      this.maxLevel = newVal;
      return newVal;
    } else {
      return -1 * this.decayIncrement;
    }
  }

  render() {

    if (this._stillActive()) {

      let newLevel = this.currentLevel + this._getTickIncrement();

      if (this._targetMet(newLevel)) {
        this.currentLevel = this.targetLevel;
        this.advance(this.state + 1);
      } else {
        this.currentLevel = newLevel;
      }
    }


    return outputLUT[Math.floor(this.currentLevel)];
  }

  _stillActive() {
    return true;
    // Any time before note off + arrival at final point?
    //return this.state < 3 || (this.state < 4 && !this.down);
  }


  _targetMet(level) {
    return this.rising === (level >= this.targetLevel);
  }


  advance(newState) {
    this.state = newState;
    if (this.state < 4) {
      let newLevel = this.levels[this.state];
      this.targetLevel = Math.max(0, (outputLevel[newLevel] << 5) - 224);
      this.rising = this.targetLevel > this.currentLevel;

      this.qr = Math.min(63, (this.rates[this.state] * 41) >> 6);
      this.decayIncrement = Math.pow(2, this.qr / 4) / 2048;
    }
  }

  noteOff() {
    this.down = false;
    this.advance(3);
  }

  isFinished() {
    this.state === 4;
  }

}
