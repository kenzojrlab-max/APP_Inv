import { User } from '../types';

export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return 'Utilisateur';
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || 'Utilisateur Inconnu';
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || amount === 0) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(amount);
}
