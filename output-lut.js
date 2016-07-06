const outputLUT = [];

// todo: make lazy

for (let i = 0; i < 4096; i++) {
  let dB = (i - 3824) * 0.0235;
  outputLUT[i] = Math.pow(20, (dB/20));
}

export default outputLUT;
