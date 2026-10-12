/**
 * Formats a string for clean display by replacing underscores with spaces.
 * Example: "Para_Para_Paravai_Ondru" -> "Para Para Paravai Ondru"
 *          "Kandukondain_Kandukondain" -> "Kandukondain Kandukondain"
 *
 * @param {string} text
 * @returns {string}
 */
export function formatDisplayName(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/_+/g, ' ').trim();
}

export default formatDisplayName;
