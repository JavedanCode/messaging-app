const units = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// Convert a compact duration string (for example, "15m" or "7d")
// into milliseconds for use with JWT and cookie expiration settings.
export function durationToMilliseconds(value) {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  return amount * units[unit];
}
