import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase';
import { User } from '../types';
import { withRetry } from '../utils/retry';

export async function createUser(userData: User, password: string): Promise<void> {
  const secondaryAppName = `SecondaryApp-${Date.now()}`;
  let secondaryApp: FirebaseApp | null = null;
  try {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
    const newUid = cred.user.uid;
    const userToSave = { ...userData, id: newUid };
    await setDoc(doc(db, 'users', newUid), userToSave);
  } finally {
    if (secondaryApp) await deleteApp(secondaryApp);
  }
}

export async function updateUser(userData: User): Promise<void> {
  await withRetry(() => setDoc(doc(db, 'users', userData.id), userData));
}

export async function deleteUser(id: string): Promise<void> {
  await withRetry(() => deleteDoc(doc(db, 'users', id)));
}
