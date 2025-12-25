import { initializeApp } from "firebase/app";
import { collection, doc, getDocs, getFirestore, writeBatch } from "firebase/firestore";

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

const run = async () => {
  const ratingsSnap = await getDocs(collection(db, "poi_ratings_agg"));
  const poiSnap = await getDocs(collection(db, "catalog_pois"));
  const ratings = ratingsSnap.docs.map((doc) => doc.data());
  const pois = poiSnap.docs.map((doc) => doc.data());

  const poiMap = new Map(pois.map((poi) => [poi.poi_id, poi]));
  const totalWeight = ratings.reduce(
    (sum, item) => sum + (item.popularity_score || 1),
    0
  );

  const pickPoi = () => {
    const target = Math.random() * (totalWeight || 1);
    let running = 0;
    for (const item of ratings) {
      running += item.popularity_score || 1;
      if (running >= target) return item.poi_id as string;
    }
    return ratings[ratings.length - 1]?.poi_id as string;
  };

  const batchSize = 400;
  let batch = writeBatch(db);
  let count = 0;
  const anonId = `anon_${Math.random().toString(36).slice(2, 12)}`;

  for (let i = 0; i < 3000; i += 1) {
    const poiId = pickPoi();
    const poi = poiMap.get(poiId);
    if (!poi) continue;
    const daysAgo = Math.floor(Math.random() * 30);
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const ref = doc(collection(db, "checkins"));
    batch.set(ref, {
      checkinId: ref.id,
      poi_id: poiId,
      lat: poi.lat,
      lng: poi.lng,
      timestamp: timestamp.toISOString(),
      userAnonId: anonId,
    });
    count += 1;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  await batch.commit();
  console.log("3000 checkin yaradıldı.");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
