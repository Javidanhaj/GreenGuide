"use client";

import React from "react";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { seedData } from "@/lib/seed";

interface RatingAgg {
  poi_id: string;
  popularity_score: number;
  checkins_30d: number;
}

interface Poi {
  poi_id: string;
  name: string;
  city: string;
  category: string;
}

export default function HeatmapPage() {
  const { user } = useAuth();
  const [ratings, setRatings] = React.useState<RatingAgg[]>([]);
  const [pois, setPois] = React.useState<Poi[]>([]);
  const [city, setCity] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [betaMap, setBetaMap] = React.useState(false);
  const [anonId, setAnonId] = React.useState("");
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("ggk_anon_id")
        : null;
    if (stored) {
      setAnonId(stored);
      return;
    }
    if (typeof window !== "undefined") {
      const generated = `anon_${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem("ggk_anon_id", generated);
      setAnonId(generated);
    }
  }, []);

  React.useEffect(() => {
    const load = async () => {
      try {
        const ratingSnap = await getDocs(collection(db, "poi_ratings_agg"));
        setRatings(ratingSnap.docs.map((doc) => doc.data() as RatingAgg));
        const poiSnap = await getDocs(collection(db, "catalog_pois"));
        setPois(poiSnap.docs.map((doc) => doc.data() as Poi));
      } catch (err) {
        setRatings(seedData.poi_ratings_agg as RatingAgg[]);
        setPois(seedData.catalog_pois as Poi[]);
        setLoadError(
          "Məlumatlar yüklənmədi. Firebase bağlantısını yoxlayın (adblocker ola bilər)."
        );
      }
    };
    load();
  }, []);

  const topPlaces = React.useMemo(() => {
    let factor = 1;
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      factor = Math.min(1, diff / 30);
    }
    let list = ratings.map((rating) => {
      const poi = pois.find((p) => p.poi_id === rating.poi_id);
      return {
        ...rating,
        name: poi?.name ?? rating.poi_id,
        city: poi?.city ?? "",
        category: poi?.category ?? "",
        display_score: Math.round(rating.popularity_score * factor),
        display_checkins: Math.round(rating.checkins_30d * factor),
      };
    });
    if (city !== "all") {
      list = list.filter((item) => item.city === city);
    }
    if (category !== "all") {
      list = list.filter((item) => item.category === category);
    }
    return list
      .sort((a, b) => b.display_score - a.display_score)
      .slice(0, 10);
  }, [ratings, pois, city, category, fromDate, toDate]);

  const hasMapbox = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

  const handleSimulate = async () => {
    if (!user || !anonId) return;
    setIsSimulating(true);
    const poiMap = new Map(pois.map((poi) => [poi.poi_id, poi]));
    const weighted = ratings.length ? ratings : [];
    const totalWeight = weighted.reduce(
      (sum, item) => sum + item.popularity_score,
      0
    );

    const pickPoi = () => {
      const target = Math.random() * (totalWeight || 1);
      let running = 0;
      for (const item of weighted) {
        running += item.popularity_score;
        if (running >= target) return item.poi_id;
      }
      return weighted[weighted.length - 1]?.poi_id ?? pois[0]?.poi_id;
    };

    const batchSize = 400;
    let batch = writeBatch(db);
    let count = 0;
    for (let i = 0; i < 3000; i += 1) {
      const poiId = pickPoi();
      const poi = poiMap.get(poiId);
      if (!poi) continue;
      const daysAgo = Math.floor(Math.random() * 30);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      const checkinRef = doc(collection(db, "checkins"));
      batch.set(checkinRef, {
        checkinId: checkinRef.id,
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
    setIsSimulating(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadError && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                {loadError}
              </div>
            )}
            <p className="text-sm text-slate-600">
              İlkin mərhələ: heatmap dummy məlumatlarla göstərilir. Gələcəkdə mobil tətbiq və
              python model ilə real-time olacaq.
            </p>
            <p className="text-xs text-slate-500">
              Məxfilik: yalnız ümumi statistika göstərilir, fərdi marşrutlar paylaşılmır.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="all">Şəhər</option>
                {[...new Set(pois.map((poi) => poi.city))].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">Kateqoriya</option>
                {[...new Set(pois.map((poi) => poi.category))].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {!imageError ? (
                <img
                  src="/heatmap_dummy.png"
                  alt="Heatmap dummy"
                  className="w-full rounded-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                  heatmap_dummy.png tapılmadı. Zəhmət olmasa faylı manual yükləyin.
                </div>
              )}
            </div>
            <Button onClick={handleSimulate} disabled={!user || isSimulating}>
              Simulyasiya et
            </Button>
            {hasMapbox && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={betaMap} onChange={(e) => setBetaMap(e.target.checked)} />
                Beta: canlı xəritə
              </label>
            )}
            {betaMap && hasMapbox && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm">
                Mapbox beta xəritəsi üçün inteqrasiya ediləcək.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top ziyarət edilən məkanlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPlaces.map((place) => (
              <div key={place.poi_id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-sm font-medium">{place.name}</p>
                  <p className="text-xs text-slate-500">
                    {place.city} · {place.category} · {place.display_checkins} giriş
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-700">
                  {place.display_score}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
