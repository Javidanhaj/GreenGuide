"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, addDays } from "date-fns";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { seedData } from "@/lib/seed";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Hotel {
  hotel_id: string;
  name: string;
  city: string;
}

export default function TripNewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hotels, setHotels] = React.useState<Hotel[]>([]);
  const [arrivalPreference, setArrivalPreference] = React.useState(
    "dəqiq_saat"
  );
  const [arrivalDate, setArrivalDate] = React.useState("");
  const [arrivalTime, setArrivalTime] = React.useState("10:00");
  const [arrivalPeriod, setArrivalPeriod] = React.useState("səhər");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [hotelId, setHotelId] = React.useState("");
  const [suggestedStart, setSuggestedStart] = React.useState("");
  const [alternateStart, setAlternateStart] = React.useState("");
  const [overrideStart, setOverrideStart] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "catalog_hotels"), orderBy("name"))
        );
        const fetched = snap.docs.map((doc) => doc.data() as Hotel);
        if (fetched.length) {
          setHotels(fetched);
        } else {
          setHotels(seedData.catalog_hotels as Hotel[]);
          setLoadError("Məlumatlar boşdur. Seed məlumatları göstərilir.");
        }
      } catch (err) {
        setHotels(seedData.catalog_hotels as Hotel[]);
        setLoadError(
          "Məlumatlar yüklənmədi. Firebase bağlantısını yoxlayın (adblocker ola bilər)."
        );
      }
    };
    load();
  }, []);

  React.useEffect(() => {
    if (!arrivalDate) return;
    if (arrivalPreference === "dəqiq_saat") {
      const time = arrivalTime || "00:00";
      const [hours, minutes] = time.split(":").map(Number);
      const arrivalDateTime = parseISO(`${arrivalDate}T${time}:00`);
      let suggested = arrivalDate;
      if (hours > 18 || (hours === 18 && minutes > 0)) {
        suggested = format(addDays(arrivalDateTime, 1), "yyyy-MM-dd");
      }
      setSuggestedStart(suggested);
      const alt =
        suggested === arrivalDate
          ? format(addDays(arrivalDateTime, 1), "yyyy-MM-dd")
          : arrivalDate;
      setAlternateStart(alt);
      if (hours > 14 && hours <= 18) {
        setOverrideStart(false);
      }
    } else {
      const suggested =
        arrivalPeriod === "səhər"
          ? arrivalDate
          : format(addDays(parseISO(arrivalDate), 1), "yyyy-MM-dd");
      setSuggestedStart(suggested);
      const alt =
        suggested === arrivalDate
          ? format(addDays(parseISO(arrivalDate), 1), "yyyy-MM-dd")
          : arrivalDate;
      setAlternateStart(alt);
    }
  }, [arrivalDate, arrivalTime, arrivalPreference, arrivalPeriod]);

  const handleSubmit = async () => {
    if (!user || !startDate || !endDate || !hotelId || !arrivalDate) {
      setError("Bütün sahələri doldurun.");
      return;
    }
    setError(null);

    const effectiveStart =
      overrideStart ? alternateStart : suggestedStart || startDate;
    const arrivalDateTime =
      arrivalPreference === "dəqiq_saat"
        ? `${arrivalDate}T${arrivalTime}`
        : null;
    const arrivalPeriodValue =
      arrivalPreference === "dəqiq_saat" ? null : arrivalPeriod;

    const docRef = await addDoc(collection(db, "trips"), {
      tripId: "",
      userId: user.uid,
      startDate,
      endDate,
      arrivalDateTime,
      arrivalPreference,
      arrivalPeriod: arrivalPeriodValue,
      hotel_id: hotelId,
      createdAt: serverTimestamp(),
      computed: {
        startPlanningDate: effectiveStart,
      },
    });
    router.push(`/app/trip/${docRef.id}`);
  };

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Yeni səfər yarat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              {loadError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Başlanğıc tarix</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Bitmə tarix</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Otel seç</label>
            <Select value={hotelId} onChange={(e) => setHotelId(e.target.value)}>
              <option value="">Otel seçin</option>
              {hotels.map((hotel) => (
                <option key={hotel.hotel_id} value={hotel.hotel_id}>
                  {hotel.name} · {hotel.city}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Gəliş tarixi</label>
              <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Gəliş seçimi</label>
              <Select
                value={arrivalPreference}
                onChange={(e) => setArrivalPreference(e.target.value)}
              >
                <option value="dəqiq_saat">Dəqiq saat</option>
                <option value="səhər_axşam">Səhər / axşam</option>
              </Select>
            </div>
          </div>

          {arrivalPreference === "dəqiq_saat" ? (
            <div>
              <label className="text-sm font-medium">Gəliş saatı</label>
              <Input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Gəliş vaxtı</label>
              <Select
                value={arrivalPeriod}
                onChange={(e) => setArrivalPeriod(e.target.value)}
              >
                <option value="səhər">Səhər</option>
                <option value="axşam">Axşam</option>
              </Select>
            </div>
          )}

          {suggestedStart && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm">
              <p>
                Tövsiyə olunan planlama günü: <strong>{suggestedStart}</strong>
              </p>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={overrideStart}
                  onChange={(e) => setOverrideStart(e.target.checked)}
                />
                Bu gün planlamağa başla / Sabahdan başla
              </label>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleSubmit}>Səfəri yarat</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
