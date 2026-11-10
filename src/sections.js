/* Home page sections that Settings can hide (v1.3.3). All are shown by default; the choice is persisted.
   Anything missing or not a boolean in saved data falls back to "shown". Pure. */
export const SECTION_KEYS = ['descriptions', 'sunnah', 'onThisDay'];

export function sanitizeSections(saved) {
  const input = saved && typeof saved === 'object' ? saved : {};
  return Object.fromEntries(SECTION_KEYS.map(key => [key, typeof input[key] === 'boolean' ? input[key] : true]));
}
