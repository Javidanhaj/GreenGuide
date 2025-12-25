# GREEN GUIDE KARABAKH

Qarabağ üçün davamlı turizm planlaşdırıcısı.

## Texnoloji yığın
- Next.js 14 (App Router) + TypeScript
- TailwindCSS + shadcn/ui (sadə komponentlər)
- Firebase Auth + Firestore (modular v9)
- Google Maps Distance Matrix API (server route)

## Quraşdırma

```bash
npm install
```

`.env` yaradın və `.env.example` faylındakı dəyərləri doldurun.

```bash
cp .env.example .env
```

### Local işə salmaq

```bash
npm run dev
```

## Seed və simulyasiya

Seed məlumatlarını Firestore-a yazmaq üçün:

```bash
npm run seed
```

3000 dummy check-in yaratmaq üçün:

```bash
npm run gen:checkins
```

Heatmap səhifəsində əlavə olaraq "Simulyasiya et" düyməsi var (dev/demo üçün).

## Google Maps API
`/api/distance` route-u Google Distance Matrix API istifadə edir. Əgər `GOOGLE_MAPS_API_KEY` boşdursa planner səhifəsində belə xəbərdarlıq çıxır:

```
Xəta: Google Maps API açarı yoxdur. Məsafə hesablanmadı.
```

## Firebase məlumat modeli
Kolleksiyalar:
- `users`
- `catalog_hotels`
- `catalog_pois`
- `catalog_restaurants`
- `poi_ratings_agg`
- `trips`
- `day_plans`
- `plan_items`
- `bookings`
- `checkins`

## Firestore security rules (nümunə)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /trips/{docId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /day_plans/{docId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /plan_items/{docId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /bookings/{docId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /checkins/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && !('userId' in request.resource.data)
        && !('uid' in request.resource.data);
    }

    match /catalog_hotels/{docId} {
      allow read: if request.auth != null;
    }

    match /catalog_pois/{docId} {
      allow read: if request.auth != null;
    }

    match /catalog_restaurants/{docId} {
      allow read: if request.auth != null;
    }

    match /poi_ratings_agg/{docId} {
      allow read: if request.auth != null;
    }
  }
}
```

## Deploy
- Vercel üçün `npm run build` ilə işləyir.
- Firebase və Google Maps env dəyişənlərini əlavə edin.
