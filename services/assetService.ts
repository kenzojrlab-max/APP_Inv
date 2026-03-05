import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Asset, User } from '../types';
import { getUserDisplayName } from '../utils/formatters';
import { withRetry } from '../utils/retry';
import { addLog } from './logService';

interface LogChange {
  field: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
}

export async function saveAsset(
  assetData: Asset,
  isNew: boolean,
  user: User,
  existingAssets: Asset[],
  reason?: string
): Promise<void> {
  const actorName = getUserDisplayName(user);
  if (isNew) {
    const newDocRef = doc(collection(db, 'assets'));
    const newAsset: Asset = { ...assetData, id: newDocRef.id, isArchived: false };
    await withRetry(() => setDoc(newDocRef, newAsset));
    await addLog(user, 'CREATE', `Creation par ${actorName}`, newAsset.code);
  } else {
    const oldAsset = existingAssets.find(a => a.id === assetData.id);
    const changes: LogChange[] = [];
    if (oldAsset) {
      const fieldsToCheck: (keyof Asset)[] = ['name', 'location', 'state', 'holder', 'category', 'description'];
      fieldsToCheck.forEach(field => {
        const oldVal = oldAsset[field];
        const newVal = assetData[field];
        if (oldVal !== newVal) {
          changes.push({ field, before: oldVal as string, after: newVal as string });
        }
      });
    }
    const { id, ...dataWithoutId } = assetData;
    await withRetry(() => updateDoc(doc(db, 'assets', assetData.id), dataWithoutId as Record<string, unknown>));
    await addLog(user, 'UPDATE', reason || `Modification par ${actorName}`, assetData.code, changes);
  }
}

export async function archiveAsset(id: string, user: User, assets: Asset[]): Promise<void> {
  const asset = assets.find(a => a.id === id);
  if (!asset) return;
  const actorName = getUserDisplayName(user);
  await withRetry(() => updateDoc(doc(db, 'assets', id), { isArchived: true, state: 'Retire' }));
  await addLog(user, 'DELETE', `Archivage par ${actorName}`, asset.code);
}

export async function restoreAsset(id: string, user: User, assets: Asset[]): Promise<void> {
  const asset = assets.find(a => a.id === id);
  if (!asset) return;
  const actorName = getUserDisplayName(user);
  await withRetry(() => updateDoc(doc(db, 'assets', id), { isArchived: false }));
  await addLog(user, 'UPDATE', `Restauration par ${actorName}`, asset.code);
}

export async function permanentDeleteAsset(id: string, user: User, assets: Asset[]): Promise<void> {
  const asset = assets.find(a => a.id === id);
  if (!asset) return;
  const actorName = getUserDisplayName(user);
  await withRetry(() => deleteDoc(doc(db, 'assets', id)));
  await addLog(user, 'DELETE', `Suppression DEFINITIVE par ${actorName}`, asset.code);
}

export async function emptyTrash(user: User, assets: Asset[]): Promise<number> {
  const archivedAssets = assets.filter(a => a.isArchived);
  if (archivedAssets.length === 0) return 0;

  const BATCH_SIZE = 450;
  const actorName = getUserDisplayName(user);

  for (let i = 0; i < archivedAssets.length; i += BATCH_SIZE) {
    const chunk = archivedAssets.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(asset => batch.delete(doc(db, 'assets', asset.id)));
    await batch.commit();
  }

  await addLog(user, 'DELETE', `VIDAGE CORBEILLE (${archivedAssets.length} elements) par ${actorName}`, 'MASS_DELETE');
  return archivedAssets.length;
}

export async function bulkImport(
  importedAssets: Partial<Asset>[],
  existingAssets: Asset[],
  user: User
): Promise<number> {
  const BATCH_SIZE = 450;
  const operations: { ref: ReturnType<typeof doc>; data: Asset }[] = [];

  for (const asset of importedAssets) {
    if (asset.code) {
      const existing = existingAssets.find(a => a.code === asset.code);
      const docRef = existing ? doc(db, 'assets', existing.id) : doc(collection(db, 'assets'));
      const finalAsset = {
        ...asset,
        id: docRef.id,
        isArchived: false,
        customAttributes: asset.customAttributes || {},
      } as Asset;
      operations.push({ ref: docRef, data: finalAsset });
    }
  }

  let count = 0;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(op => batch.set(op.ref, op.data, { merge: true }));
    await batch.commit();
    count += chunk.length;
  }

  const actorName = getUserDisplayName(user);
  await addLog(user, 'CONFIG', `Import Excel : ${count} elements par ${actorName}.`);
  return count;
}
