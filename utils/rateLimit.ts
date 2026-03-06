const actionTimestamps: Map<string, number[]> = new Map();

/**
 * Verifie si une action depasse la limite de frequence autorisee.
 * @param actionKey Identifiant de l'action (ex: 'asset-create', 'asset-import')
 * @param maxCalls Nombre maximum d'appels autorises dans la fenetre
 * @param windowMs Fenetre de temps en millisecondes (defaut: 60s)
 * @returns true si l'action est autorisee, false si bloquee
 */
export function checkRateLimit(actionKey: string, maxCalls: number, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = actionTimestamps.get(actionKey) || [];

  // Nettoyer les timestamps hors fenetre
  const recent = timestamps.filter(t => now - t < windowMs);

  if (recent.length >= maxCalls) {
    actionTimestamps.set(actionKey, recent);
    return false;
  }

  recent.push(now);
  actionTimestamps.set(actionKey, recent);
  return true;
}
