/**
 * Nettoie une chaine de caracteres pour prevenir les injections.
 * Supprime les balises HTML/script, les caracteres de controle, et les formules Excel.
 */
export function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();

  // Supprimer les balises HTML/script
  str = str.replace(/<[^>]*>/g, '');

  // Bloquer les formules Excel (injection CSV/Excel)
  // Les cellules commencant par =, +, -, @ peuvent etre interpretees comme formules
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }

  // Supprimer les caracteres de controle (sauf newline, tab)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Limiter la longueur pour eviter les abus
  if (str.length > 5000) {
    str = str.substring(0, 5000);
  }

  return str;
}

/**
 * Sanitize un nombre importe depuis Excel.
 */
export function sanitizeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const str = String(value).replace(/[^0-9.\-]/g, '');
  const num = parseFloat(str);
  if (isNaN(num) || !isFinite(num)) return 0;
  // Limiter a des valeurs raisonnables
  if (num < 0) return 0;
  if (num > 999999999999) return 999999999999;
  return num;
}

/**
 * Valide et sanitize un code inventaire.
 */
export function sanitizeCode(value: unknown): string {
  if (value === null || value === undefined) return '';
  // Autoriser uniquement les caracteres alphanumeriques, tirets, underscores
  return String(value).trim().replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 50);
}
