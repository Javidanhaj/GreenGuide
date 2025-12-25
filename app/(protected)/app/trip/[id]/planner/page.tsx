"use client";

import React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { addMinutes, format, parse } from "date-fns";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

interface Trip {
  hotel_id: string;
}

interface Hotel {
  hotel_id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Poi {
  poi_id: string;
  name: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  category: string;
  avg_visit_min: number;
  entry_fee_azn: number;
  eco_sensitivity: string;
  green_metrics: {
    renewable_energy_pct: number;
    recycling_rate_pct: number;
    carbon_kg_per_visit: number;
    tree_care_score: number;
    overall_green_score: number;
  };
  sponsored: boolean;
  booking: { required: boolean; price_azn: number; booking_type: string };
  opening_hours: string;
  info_url: string;
}

interface Restaurant {
  restaurant_id: string;
  name: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  cuisine: string[];
  price_level: string;
  green_score: number;
  menu_url: string;
  opening_hours: string;
  booking: { reservable: boolean; price_azn: number; booking_type: string };
  sponsored: boolean;
}

interface RatingAgg {
  poi_id: string;
  avg_rating: number;
  popularity_score: number;
}

interface PlanItem {
  itemId: string;
  itemType: "poi" | "restaurant";
  refId: string;
  name: string;
  lat: number;
  lng: number;
  plannedDurationMin: number;
  transportOverride: "driving" | "walking" | "transit" | null;
  computed?: {
    departTime?: string;
    arriveTime?: string;
    leaveTime?: string;
    legDistanceKmFromPrev?: number | null;
    legTravelMinFromPrev?: number | null;
  };
}

interface DistanceResponse {
  distance_km: number | null;
  duration_min: number | null;
  error?: string;
}

const transportModes = [
  { value: "driving", label: "Avto" },
  { value: "walking", label: "Piyada" },
  { value: "transit", label: "Tranzit" },
];

export default function PlannerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const tripId = params.id as string;
  const date = searchParams.get("date") || "";
  const [hotel, setHotel] = React.useState<Hotel | null>(null);
  const [pois, setPois] = React.useState<Poi[]>([]);
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([]);
  const [ratings, setRatings] = React.useState<Record<string, RatingAgg>>({});
  const [filterType, setFilterType] = React.useState("all");
  const [filterCity, setFilterCity] = React.useState("all");
  const [filterCategory, setFilterCategory] = React.useState("all");
  const [sponsorFirst, setSponsorFirst] = React.useState(false);
  const [sortBy, setSortBy] = React.useState("popularity");
  const [startTime, setStartTime] = React.useState("09:00");
  const [transportMode, setTransportMode] = React.useState<
    "driving" | "walking" | "transit"
  >("driving");
  const [planItems, setPlanItems] = React.useState<PlanItem[]>([]);
  const [totals, setTotals] = React.useState({
    travelMin: 0,
    visitMin: 0,
    dayMin: 0,
    endTime: "",
  });
  const [distanceError, setDistanceError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const cacheRef = React.useRef<Map<string, DistanceResponse>>(new Map());

  React.useEffect(() => {
    const load = async () => {
      const tripSnap = await getDoc(doc(db, "trips", tripId));
      if (!tripSnap.exists()) return;
      const trip = tripSnap.data() as Trip;
      const hotelSnap = await getDocs(
        query(
          collection(db, "catalog_hotels"),
          where("hotel_id", "==", trip.hotel_id)
        )
      );
      if (!hotelSnap.empty) {
        setHotel(hotelSnap.docs[0].data() as Hotel);
      }
      const poiSnap = await getDocs(collection(db, "catalog_pois"));
      setPois(poiSnap.docs.map((doc) => doc.data() as Poi));
      const restaurantSnap = await getDocs(collection(db, "catalog_restaurants"));
      setRestaurants(restaurantSnap.docs.map((doc) => doc.data() as Restaurant));
      const ratingSnap = await getDocs(collection(db, "poi_ratings_agg"));
      const ratingMap: Record<string, RatingAgg> = {};
      ratingSnap.docs.forEach((doc) => {
        const data = doc.data() as RatingAgg;
        ratingMap[data.poi_id] = data;
      });
      setRatings(ratingMap);
    };
    load();
  }, [tripId]);

  const allItems = React.useMemo(() => {
    const poiItems = pois.map((poi) => ({
      id: poi.poi_id,
      type: "poi" as const,
      name: poi.name,
      data: poi,
      city: poi.city,
      category: poi.category,
      sponsored: poi.sponsored,
      rating: ratings[poi.poi_id]?.avg_rating ?? 4.3,
      popularity: ratings[poi.poi_id]?.popularity_score ?? 70,
    }));
    const restaurantItems = restaurants.map((rest) => ({
      id: rest.restaurant_id,
      type: "restaurant" as const,
      name: rest.name,
      data: rest,
      city: rest.city,
      category: rest.cuisine[0] || "Restoran",
      sponsored: rest.sponsored,
      rating: Math.min(5, 3.5 + rest.green_score / 40),
      popularity: Math.round(rest.green_score * 2),
    }));

    let items = [...poiItems, ...restaurantItems];
    if (filterType !== "all") {
      items = items.filter((item) => item.type === filterType);
    }
    if (filterCity !== "all") {
      items = items.filter((item) => item.city === filterCity);
    }
    if (filterCategory !== "all") {
      items = items.filter((item) => item.category === filterCategory);
    }
    if (sortBy === "popularity") {
      items = items.sort((a, b) => b.popularity - a.popularity);
    } else {
      items = items.sort((a, b) => {
        const aScore =
          a.type === "poi"
            ? a.data.green_metrics.overall_green_score
            : a.data.green_score;
        const bScore =
          b.type === "poi"
            ? b.data.green_metrics.overall_green_score
            : b.data.green_score;
        return bScore - aScore;
      });
    }
    if (sponsorFirst) {
      items = items.sort((a, b) => Number(b.sponsored) - Number(a.sponsored));
    }
    return items;
  }, [
    pois,
    restaurants,
    filterType,
    filterCity,
    filterCategory,
    sortBy,
    sponsorFirst,
    ratings,
  ]);

  const handleAddItem = (item: typeof allItems[number]) => {
    const plannedDurationMin = item.type === "poi" ? item.data.avg_visit_min : 60;
    setPlanItems((prev) => [
      ...prev,
      {
        itemId: `${item.type}-${item.id}-${Date.now()}`,
        itemType: item.type,
        refId: item.id,
        name: item.name,
        lat: item.data.lat,
        lng: item.data.lng,
        plannedDurationMin,
        transportOverride: null,
      },
    ]);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    setPlanItems((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const computeSchedule = React.useCallback(async () => {
    if (!hotel) return;
    if (!planItems.length) {
      setTotals({ travelMin: 0, visitMin: 0, dayMin: 0, endTime: "" });
      return;
    }
    const baseTime = parse(startTime, "HH:mm", new Date());
    let currentTime = baseTime;
    let totalTravel = 0;
    let totalVisit = 0;
    const updatedItems: PlanItem[] = [];
    let prevLat = hotel.lat;
    let prevLng = hotel.lng;
    setDistanceError(null);

    for (const item of planItems) {
      const mode = item.transportOverride || transportMode;
      const cacheKey = `${prevLat},${prevLng}-${item.lat},${item.lng}-${mode}`;
      let distance = cacheRef.current.get(cacheKey);
      if (!distance) {
        const res = await fetch("/api/distance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origins: [{ lat: prevLat, lng: prevLng }],
            destinations: [{ lat: item.lat, lng: item.lng }],
            mode,
          }),
        });
        distance = (await res.json()) as DistanceResponse;
        cacheRef.current.set(cacheKey, distance);
      }

      if (distance?.error) {
        setDistanceError(distance.error);
      }

      const travelMin = distance?.duration_min ?? 0;
      totalTravel += travelMin ?? 0;
      currentTime = addMinutes(currentTime, travelMin ?? 0);
      const arriveTime = format(currentTime, "HH:mm");
      const leaveTime = format(
        addMinutes(currentTime, item.plannedDurationMin),
        "HH:mm"
      );
      totalVisit += item.plannedDurationMin;
      currentTime = addMinutes(currentTime, item.plannedDurationMin);

      updatedItems.push({
        ...item,
        computed: {
          departTime: format(
            addMinutes(currentTime, -item.plannedDurationMin - (travelMin ?? 0)),
            "HH:mm"
          ),
          arriveTime,
          leaveTime,
          legDistanceKmFromPrev: distance?.distance_km ?? null,
          legTravelMinFromPrev: travelMin ?? null,
        },
      });
      prevLat = item.lat;
      prevLng = item.lng;
    }

    const backKey = `${prevLat},${prevLng}-${hotel.lat},${hotel.lng}-${transportMode}`;
    let backDistance = cacheRef.current.get(backKey);
    if (!backDistance) {
      const res = await fetch("/api/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origins: [{ lat: prevLat, lng: prevLng }],
          destinations: [{ lat: hotel.lat, lng: hotel.lng }],
          mode: transportMode,
        }),
      });
      backDistance = (await res.json()) as DistanceResponse;
      cacheRef.current.set(backKey, backDistance);
    }

    if (backDistance?.error) {
      setDistanceError(backDistance.error);
    }

    const backTravel = backDistance?.duration_min ?? 0;
    totalTravel += backTravel ?? 0;
    currentTime = addMinutes(currentTime, backTravel ?? 0);

    setPlanItems(updatedItems);
    const dayMin = totalTravel + totalVisit;
    setTotals({
      travelMin: totalTravel,
      visitMin: totalVisit,
      dayMin,
      endTime: format(currentTime, "HH:mm"),
    });
  }, [hotel, planItems, startTime, transportMode]);

  React.useEffect(() => {
    if (planItems.length) {
      computeSchedule();
    }
  }, [planItems, startTime, transportMode, computeSchedule]);

  const handleSave = async () => {
    if (!user || !hotel) return;
    const planId = `${tripId}_${date}`;
    await setDoc(doc(db, "day_plans", planId), {
      planId,
      tripId,
      userId: user.uid,
      date,
      transportModeDefault: transportMode,
      startTime,
      endTimePlanned: totals.endTime,
      totalTravelMin: totals.travelMin,
      totalVisitMin: totals.visitMin,
      totalDayMin: totals.dayMin,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const batch = writeBatch(db);
    planItems.forEach((item, index) => {
      const itemId = `${planId}_${index}`;
      batch.set(doc(db, "plan_items", itemId), {
        itemId,
        planId,
        userId: user.uid,
        orderIndex: index,
        itemType: item.itemType,
        refId: item.refId,
        plannedDurationMin: item.plannedDurationMin,
        note: "",
        transportOverride: item.transportOverride,
        computed: item.computed,
      });
      batch.set(doc(db, "bookings", `${itemId}_booking`), {
        bookingId: `${itemId}_booking`,
        userId: user.uid,
        tripId,
        planId,
        itemId,
        itemType: item.itemType,
        refId: item.refId,
        date,
        status_az: item.itemType === "restaurant" ? "Rezerv edildi" : "Bron edildi",
        price_azn: item.itemType === "restaurant" ? 0 : 0,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
    setConfirmOpen(false);
  };

  const showLateWarning = totals.endTime && totals.endTime > "22:00";

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Məkan seçimi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Hamısı</option>
                <option value="poi">Məkan (POI)</option>
                <option value="restaurant">Restoran</option>
              </Select>
              <Select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              >
                <option value="all">Şəhər</option>
                {[...new Set(allItems.map((item) => item.city))].map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Kateqoriya</option>
                {[...new Set(allItems.map((item) => item.category))].map(
                  (category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  )
                )}
              </Select>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="popularity">Populyarlıq</option>
                <option value="green">Yaşıl göstərici</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sponsorFirst}
                onChange={(e) => setSponsorFirst(e.target.checked)}
              />
              Sponsorlu əvvəlcə
            </label>
            <div className="space-y-4">
              {allItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Badge>{item.type === "poi" ? "Məkan" : "Restoran"}</Badge>
                        <span>{item.category}</span>
                      </div>
                    </div>
                    {item.sponsored && <Badge>Sponsorlu</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    Reytinq {item.rating.toFixed(1)} · Populyarlıq {item.popularity}
                  </p>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">Yaşıl göstəricilər</p>
                    {item.type === "poi" ? (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <span>
                          Ümumi: {item.data.green_metrics.overall_green_score}
                        </span>
                        <span>
                          Enerji: {item.data.green_metrics.renewable_energy_pct}%
                        </span>
                        <span>
                          Təkrar emal: {item.data.green_metrics.recycling_rate_pct}%
                        </span>
                        <span>
                          Karbon: {item.data.green_metrics.carbon_kg_per_visit} kg
                        </span>
                        <span>
                          Ağac qayğı: {item.data.green_metrics.tree_care_score}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <span>Ümumi: {item.data.green_score}</span>
                        <span>Enerji: 62%</span>
                        <span>Təkrar emal: 48%</span>
                        <span>Karbon: 1.2 kg</span>
                        <span>Ağac qayğı: 70</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-slate-600">
                    <p>İş saatları: {item.data.opening_hours}</p>
                    <p>
                      Qiymət: {item.data.booking?.price_azn ?? 0} AZN ·{" "}
                      {item.data.booking?.booking_type ?? "pulsuz"}
                    </p>
                    {item.type === "poi" && (
                      <a
                        href={item.data.info_url}
                        className="text-emerald-700 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ətraflı
                      </a>
                    )}
                    {item.type === "restaurant" && (
                      <a
                        href={item.data.menu_url}
                        className="text-emerald-700 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Menü
                      </a>
                    )}
                  </div>
                  <Button className="mt-3" onClick={() => handleAddItem(item)}>
                    Plana əlavə et
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gün planı ({date})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {distanceError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Xəta: Google Maps API açarı yoxdur. Məsafə hesablanmadı.
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Başlama saatı</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nəqliyyat</label>
                <Select
                  value={transportMode}
                  onChange={(e) =>
                    setTransportMode(
                      e.target.value as "driving" | "walking" | "transit"
                    )
                  }
                >
                  {transportModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm">
                Otel -> Günə başla ({startTime})
              </div>
              {planItems.map((item, index) => (
                <div
                  key={item.itemId}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveItem(index, "up")}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveItem(index, "down")}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Gəliş: {item.computed?.arriveTime ?? "--:--"} · Çıxış:{" "}
                    {item.computed?.leaveTime ?? "--:--"}
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div>
                      <label className="text-xs">Müddət (dəq)</label>
                      <Input
                        type="number"
                        value={item.plannedDurationMin}
                        onChange={(e) =>
                          setPlanItems((prev) =>
                            prev.map((p) =>
                              p.itemId === item.itemId
                                ? {
                                    ...p,
                                    plannedDurationMin: Number(e.target.value),
                                  }
                                : p
                            )
                          )
                        }
                      />
                      <div className="mt-1 flex gap-2">
                        {[60, 120, 180].map((preset) => (
                          <Button
                            key={preset}
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPlanItems((prev) =>
                                prev.map((p) =>
                                  p.itemId === item.itemId
                                    ? { ...p, plannedDurationMin: preset }
                                    : p
                                )
                              )
                            }
                          >
                            {preset}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs">Nəqliyyat (leg)</label>
                      <Select
                        value={item.transportOverride ?? ""}
                        onChange={(e) =>
                          setPlanItems((prev) =>
                            prev.map((p) =>
                              p.itemId === item.itemId
                                ? {
                                    ...p,
                                    transportOverride:
                                      (e.target.value as
                                        | "driving"
                                        | "walking"
                                        | "transit") || null,
                                  }
                                : p
                            )
                          )
                        }
                      >
                        <option value="">Defolt</option>
                        {transportModes.map((mode) => (
                          <option key={mode.value} value={mode.value}>
                            {mode.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm">
                Otelə geri dönüş: {totals.endTime || "--:--"}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <p>Ümumi səfər vaxtı: {totals.travelMin} dəq</p>
              <p>Ümumi ziyarət vaxtı: {totals.visitMin} dəq</p>
              <p>Günün cəmi: {totals.dayMin} dəq</p>
              {distanceError && (
                <p className="text-xs text-slate-500">Vaxt hesablanmayıb.</p>
              )}
            </div>

            {showLateWarning && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                Xəbərdarlıq: Plan çox uzundur. Bitmə vaxtı gecdir.
              </div>
            )}

            <Button onClick={() => setConfirmOpen(true)}>Günü təsdiqlə</Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Təsdiq</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Günü təsdiqləmək istəyirsiniz? Bu zaman {planItems.length} rezerv/bron
            yaradılacaq.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Ləğv et
            </Button>
            <Button onClick={handleSave}>Təsdiqlə</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
