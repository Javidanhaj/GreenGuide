"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Trip {
  startDate: string;
  endDate: string;
  computed?: { startPlanningDate?: string };
}

interface DayPlan {
  date: string;
}

export default function TripOverviewPage() {
  const params = useParams();
  const tripId = params.id as string;
  const [trip, setTrip] = React.useState<Trip | null>(null);
  const [plannedDates, setPlannedDates] = React.useState<string[]>([]);

  React.useEffect(() => {
    const load = async () => {
      const tripSnap = await getDoc(doc(db, "trips", tripId));
      if (tripSnap.exists()) {
        setTrip(tripSnap.data() as Trip);
      }
      const planSnap = await getDocs(
        query(collection(db, "day_plans"), where("tripId", "==", tripId))
      );
      setPlannedDates(planSnap.docs.map((doc) => doc.data().date));
    };
    load();
  }, [tripId]);

  if (!trip) {
    return (
      <AppShell>
        <p>Yüklənir...</p>
      </AppShell>
    );
  }

  const days = eachDayOfInterval({
    start: parseISO(trip.startDate),
    end: parseISO(trip.endDate),
  });

  return (
    <AppShell>
      <div className="space-y-4">
        {trip.computed?.startPlanningDate && (
          <Card>
            <CardHeader>
              <CardTitle>Defolt planlama günü</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {trip.computed.startPlanningDate} üçün planlamaya başla.
              </p>
              <Link
                href={`/app/trip/${tripId}/planner?date=${trip.computed.startPlanningDate}`}
              >
                <Button>Plan qur</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Səfər günləri</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {days.map((day) => {
              const date = format(day, "yyyy-MM-dd");
              const planned = plannedDates.includes(date);
              return (
                <div
                  key={date}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{date}</p>
                    <Badge className={planned ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                      {planned ? "Planlanıb" : "Planlanmayıb"}
                    </Badge>
                  </div>
                  <Link href={`/app/trip/${tripId}/planner?date=${date}`}>
                    <Button variant="outline">Plan qur</Button>
                  </Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
