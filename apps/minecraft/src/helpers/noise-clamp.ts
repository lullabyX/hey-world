export const clampNoise = (
  noiseValue: number,
  outputMin: number = 0,
  outputMax: number = 1,
  inputMin: number = -1,
  inputMax: number = 1
): number => {
  // Guard against invalid input range to avoid division by zero
  if (inputMin === inputMax) {
    return outputMin;
  }

  // Clamp the incoming noise into the expected input range
  const clampedInput = Math.min(Math.max(noiseValue, inputMin), inputMax);

  // Normalize to 0..1 within the input range
  const normalized = (clampedInput - inputMin) / (inputMax - inputMin);

  // Scale to the requested output range
  return outputMin + normalized * (outputMax - outputMin);
};
