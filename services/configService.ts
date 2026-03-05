import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppConfig } from '../types';
import { withRetry } from '../utils/retry';

export async function saveConfig(config: AppConfig): Promise<void> {
  await withRetry(() => setDoc(doc(db, 'parametre', 'system_config'), config));
}
