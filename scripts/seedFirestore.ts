import { initializeApp } from "firebase/app";
import {
  doc,
  getFirestore,
  writeBatch,
} from "firebase/firestore";
import seed from "../data/seed.json";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  throw new Error("Firebase env dəyişənlərini doldurun.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const batchWrite = async (collectionName: string, items: Record<string, any>[]) => {
  const batchSize = 400;
  let batch = writeBatch(db);
  let count = 0;
  for (const item of items) {
    const id = item.hotel_id || item.restaurant_id || item.poi_id;
    if (!id) continue;
    const ref = doc(db, collectionName, id);
    batch.set(ref, item, { merge: true });
    count += 1;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  await batch.commit();
};

const run = async () => {
  await batchWrite("catalog_hotels", seed.catalog_hotels);
  await batchWrite("catalog_restaurants", seed.catalog_restaurants);
  await batchWrite("catalog_pois", seed.catalog_pois);
  await batchWrite("poi_ratings_agg", seed.poi_ratings_agg);
  console.log("Seed tamamlandı.");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
