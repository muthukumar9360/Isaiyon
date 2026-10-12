/**
 * Formats a string so that every word has its first letter capitalized,
 * and words are connected with underscores (e.g. "neer paravai" -> "Neer_Paravai").
 *
 * @param {string} text - Input text (e.g. Movie Name or Track Title)
 * @param {string} [fallback='Soundtrack'] - Fallback value if text is empty
 * @returns {string} Clean URL/filesystem safe slug
 */
export function slugify(text, fallback = 'Soundtrack') {
  if (!text || typeof text !== 'string') return fallback;

  const cleaned = text.replace(/[^\w\s-]/g, '').trim();
  if (!cleaned) return fallback;

  const words = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;

  const capitalized = words.map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return capitalized.join('_').substring(0, 60) || fallback;
}

/**
 * Removes underscores and replaces them with spaces for clean display in UI.
 *
 * @param {string} text
 * @returns {string}
 */
export function formatDisplayName(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/_+/g, ' ').trim();
}

export default slugify;
