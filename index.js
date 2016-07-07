import outputLevel from './output-level';
import outputLUT from './output-lut';


export default class Envelope {

  constructor(context, config) {
    this.levels = config.levels;
    this.rates = config.rates;
    this.currentLevel = 0;

    this.sampleRate = 49096;

    this.decayIncrement = 0;
    this.advance(0);

    this.getADCurve();
    this.getReleaseCurve();

  }

  getADCurve() {
    if (this.attackDecayCurve) {
      return this.attackDecayCurve;
    }

    const curve = [];
    let sameInARowCount = 0;
    let lastSeenValue = false;

    while (curve.length < 1000000) {

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
    this.attackDecayCurve = curve;
    return curve;
  }

  getReleaseCurve() {
    if (this.releaseCurve) {
      return this.releaseCurve;
    }

    this.currentLevel = 0;
    this.levels[2] = Math.max.apply(Math, this.levels.slice(0, 3));
    this.advance(2);
    this.currentLevel = this.targetLevel;

    const curve = [];

    let sameInARowCount = 0;
    let lastSeenValue = false;

    while (curve.length < 1000000) {
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


    this.releaseCurve = curve;
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
