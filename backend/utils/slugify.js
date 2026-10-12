/**
 * Generates an Archive.org safe directory and filename slug.
 * Compatible with the existing Python bridge naming convention.
 *
 * @param {string} text - Input text (e.g. Movie Name or Track Title)
 * @param {string} [fallback='soundtrack'] - Fallback value if text is empty
 * @returns {string} Clean URL/filesystem safe slug
 */
export function slugify(text, fallback = 'soundtrack') {
  if (!text || typeof text !== 'string') return fallback;
  const clean = text
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '_');
  return clean.substring(0, 45) || fallback;
}

export default slugify;
