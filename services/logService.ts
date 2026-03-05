import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Log, User } from '../types';
import { getUserDisplayName } from '../utils/formatters';
import { withRetry } from '../utils/retry';

type LogAction = Log['action'];

interface LogChange {
  field: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
}

export async function addLog(
  user: User | null,
  action: LogAction,
  description: string,
  targetCode?: string,
  changes?: LogChange[]
): Promise<void> {
  const safeUserId = user?.id || auth.currentUser?.uid || 'ID_INCONNU';
  const safeUserEmail = user?.email || auth.currentUser?.email || 'email_inconnu';
  const userName = getUserDisplayName(user);

  const safeChanges = changes
    ? changes.map(c => ({
        field: c.field ?? 'Inconnu',
        before: c.before === undefined ? null : c.before,
        after: c.after === undefined ? null : c.after,
      }))
    : null;

  const newLog: Record<string, unknown> = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    userId: safeUserId,
    userEmail: safeUserEmail,
    userName,
    action,
    description,
    targetCode: targetCode ?? 'N/A',
  };
  if (safeChanges) newLog.changes = safeChanges;

  await withRetry(() => setDoc(doc(db, 'logs', newLog.id as string), newLog));
}
