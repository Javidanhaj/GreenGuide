"use client";

import Link from "next/link";
import React from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PoiRating {
  poi_id: string;
  avg_rating: number;
  review_count: number;
  checkins_30d: number;
  popularity_score: number;
  top_tags: string[];
}

interface Poi {
  poi_id: string;
  name: string;
}

interface Trip {
  tripId: string;
  startDate: string;
  endDate: string;
}

interface SponsoredItem {
  id: string;
  name: string;
  city: string;
  type: "poi" | "restaurant";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [topPlaces, setTopPlaces] = React.useState<PoiRating[]>([]);
  const [activeTrip, setActiveTrip] = React.useState<Trip | null>(null);
  const [promoted, setPromoted] = React.useState<SponsoredItem[]>([]);
  const [nextPlanned, setNextPlanned] = React.useState<string | null>(null);
  const [poiMap, setPoiMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!user) return;
    const load = async () => {
      const ratingSnap = await getDocs(
        query(collection(db, "poi_ratings_agg"), limit(6))
      );
      setTopPlaces(ratingSnap.docs.map((doc) => doc.data() as PoiRating));
      const poiSnap = await getDocs(collection(db, "catalog_pois"));
      const map: Record<string, string> = {};
      poiSnap.docs.forEach((doc) => {
        const data = doc.data() as Poi;
        map[data.poi_id] = data.name;
      });
      setPoiMap(map);

      const tripSnap = await getDocs(
        query(
          collection(db, "trips"),
          where("userId", "==", user.uid),
          limit(1)
        )
      );
      if (!tripSnap.empty) {
        const data = tripSnap.docs[0].data() as Trip;
        setActiveTrip({
          tripId: tripSnap.docs[0].id,
          startDate: data.startDate,
          endDate: data.endDate,
        });
        const planSnap = await getDocs(
          query(
            collection(db, "day_plans"),
            where("tripId", "==", tripSnap.docs[0].id)
          )
        );
        const dates = planSnap.docs
          .map((doc) => doc.data().date as string)
          .sort();
        setNextPlanned(dates[0] ?? null);
      }

      const poiSnap = await getDocs(
        query(collection(db, "catalog_pois"), where("sponsored", "==", true))
      );
      const restaurantSnap = await getDocs(
        query(
          collection(db, "catalog_restaurants"),
          where("sponsored", "==", true)
        )
      );
      const promotedItems: SponsoredItem[] = [
        ...poiSnap.docs.map((doc) => ({
          id: doc.data().poi_id as string,
          name: doc.data().name as string,
          city: doc.data().city as string,
          type: "poi" as const,
        })),
        ...restaurantSnap.docs.map((doc) => ({
          id: doc.data().restaurant_id as string,
          name: doc.data().name as string,
          city: doc.data().city as string,
          type: "restaurant" as const,
        })),
      ];
      setPromoted(promotedItems.slice(0, 10));
    };
    load();
  }, [user]);

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Yeni səfər</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              Qarabağ səyahətini qurmaq üçün məlumatları daxil et.
            </p>
            <Link href="/app/trip/new">
              <Button>Yeni səfər yarat</Button>
            </Link>
          </CardContent>
        </Card>

        {activeTrip && (
          <Card>
            <CardHeader>
              <CardTitle>Aktiv səfər</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  {activeTrip.startDate} - {activeTrip.endDate}
                </p>
                <p className="text-xs text-slate-500">
                  Növbəti planlanan gün: {nextPlanned ?? "Hələ yoxdur"}.
                </p>
              </div>
              <Link href={`/app/trip/${activeTrip.tripId}`}>
                <Button variant="outline">Səfərə bax</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Önə çəkilənlər</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {promoted.map((item) => (
                <div
                  key={item.id}
                  className="min-w-[220px] rounded-lg border border-emerald-100 bg-emerald-50 p-4"
                >
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-slate-600">{item.city}</p>
                  <Badge className="mt-2">Sponsorlu</Badge>
                </div>
              ))}
              {!promoted.length && (
                <p className="text-sm text-slate-500">
                  Sponsorlu məkan yoxdur.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top məkanlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPlaces.map((place) => (
                <div
                  key={place.poi_id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {poiMap[place.poi_id] ?? place.poi_id}
                    </p>
                    <p className="text-xs text-slate-500">
                      Reytinq {place.avg_rating} · Populyarlıq {place.popularity_score}
                    </p>
                  </div>
                  <Badge>{place.checkins_30d} giriş</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
