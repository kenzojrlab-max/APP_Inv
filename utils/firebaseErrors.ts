const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/invalid-email': 'Format email invalide.',
  'auth/user-not-found': 'Identifiants incorrects.',
  'auth/wrong-password': 'Identifiants incorrects.',
  'auth/invalid-credential': 'Identifiants incorrects.',
  'auth/too-many-requests': 'Compte temporairement bloque. Reessayez plus tard.',
  'auth/network-request-failed': 'Verifiez votre connexion internet.',
  'auth/email-already-in-use': 'Cet email est deja utilise.',
  'auth/weak-password': 'Mot de passe trop faible (minimum 6 caracteres).',
  'auth/user-disabled': 'Ce compte a ete desactive.',
  // Firestore errors
  'permission-denied': 'Acces refuse. Vous n\'avez pas les permissions necessaires.',
  'not-found': 'Document introuvable.',
  'already-exists': 'Ce document existe deja.',
  'resource-exhausted': 'Limite de requetes atteinte. Reessayez dans quelques instants.',
  'unavailable': 'Service temporairement indisponible. Verifiez votre connexion.',
  'deadline-exceeded': 'La requete a pris trop de temps. Reessayez.',
  'cancelled': 'Operation annulee.',
  'data-loss': 'Perte de donnees detectee. Contactez l\'administrateur.',
};

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Firebase errors have a 'code' property
    const code = (error as { code?: string }).code;
    if (code && FIREBASE_ERROR_MESSAGES[code]) {
      return FIREBASE_ERROR_MESSAGES[code];
    }
    // Check for network errors
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return 'Erreur reseau. Verifiez votre connexion internet.';
    }
  }
  return 'Une erreur inattendue est survenue. Reessayez.';
}
