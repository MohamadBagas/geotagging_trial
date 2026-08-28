import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const app = initializeApp(config);
export const db = getFirestore(app);
export const storage = getStorage(app);

export interface Geotag {
  id?: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  mediaUrl: string; // Unified URL for photo or video
  mediaType: 'image' | 'video';
  createdAt: any;
  // For backward compatibility:
  photoBase64?: string;
}

export const addGeotag = async (data: Omit<Geotag, 'id' | 'createdAt'>) => {
  return await addDoc(collection(db, 'geotags'), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToGeotags = (callback: (geotags: Geotag[]) => void) => {
  const q = query(collection(db, 'geotags'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const geotags: Geotag[] = [];
    snapshot.forEach((doc) => {
      geotags.push({ id: doc.id, ...doc.data() } as Geotag);
    });
    callback(geotags);
  });
};

export const uploadMedia = async (file: File | Blob, type: 'image' | 'video', filename: string): Promise<string> => {
  try {
    const storageRef = ref(storage, `media/${Date.now()}_${filename}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.warn("Firebase Storage upload failed, likely due to security rules. Falling back to base64 if image.", error);
    throw error;
  }
};
