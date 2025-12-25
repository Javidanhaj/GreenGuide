"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  where,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserProfile {
  ad: string;
  soyad: string;
  email: string;
  phone?: string;
  country?: string;
}

interface Trip {
  tripId: string;
  startDate: string;
  endDate: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [trips, setTrips] = React.useState<Trip[]>([]);

  React.useEffect(() => {
    if (!user) return;
    const load = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        setProfile({
          ad: user.displayName?.split(" ")[0] ?? "",
          soyad: user.displayName?.split(" ")[1] ?? "",
          email: user.email ?? "",
          phone: "",
          country: "",
        });
      }
      const tripsSnap = await getDocs(
        query(collection(db, "trips"), where("userId", "==", user.uid))
      );
      setTrips(
        tripsSnap.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<Trip, "tripId">;
          return { tripId: docSnap.id, ...data };
        })
      );
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        ad: profile.ad,
        soyad: profile.soyad,
        email: profile.email,
        phone: profile.phone || "",
        country: profile.country || "",
      },
      { merge: true }
    );
  };

  if (!profile) {
    return (
      <AppShell>
        <p>Yüklənir...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Ad</label>
                <Input
                  value={profile.ad}
                  onChange={(e) =>
                    setProfile((prev) => (prev ? { ...prev, ad: e.target.value } : prev))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Soyad</label>
                <Input
                  value={profile.soyad}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, soyad: e.target.value } : prev
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={profile.email}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, email: e.target.value } : prev
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input
                  value={profile.phone || ""}
                  onChange={(e) =>
                    setProfile((prev) => (prev ? { ...prev, phone: e.target.value } : prev))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ölkə</label>
                <Input
                  value={profile.country || ""}
                  onChange={(e) =>
                    setProfile((prev) => (prev ? { ...prev, country: e.target.value } : prev))
                  }
                />
              </div>
            </div>
            <Button onClick={handleSave}>Yadda saxla</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Səfərlərim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trips.map((trip) => (
              <div key={trip.tripId} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium">{trip.startDate} - {trip.endDate}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
