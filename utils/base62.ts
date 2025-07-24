/**
 * Generates a random 6-character base62 string
 * @returns {string}
 */
export function generateRandomBase62(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * 62);
    result += chars[idx];
  }
  return result;
}
