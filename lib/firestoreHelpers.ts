import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getDocData<T>(collectionName: string, id: string) {
  const snap = await getDoc(doc(db, collectionName, id));
  return snap.exists() ? (snap.data() as T) : null;
}
