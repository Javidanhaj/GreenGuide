import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      distance_km: null,
      duration_min: null,
      error: "Xəta: Google Maps API açarı yoxdur. Məsafə hesablanmadı.",
    });
  }

  const { origins, destinations, mode } = body as {
    origins: { lat: number; lng: number }[];
    destinations: { lat: number; lng: number }[];
    mode: "driving" | "walking" | "transit";
  };

  const originParam = origins.map((o) => `${o.lat},${o.lng}`).join("|");
  const destParam = destinations.map((d) => `${d.lat},${d.lng}`).join("|");

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    originParam
  )}&destinations=${encodeURIComponent(destParam)}&mode=${mode}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    return NextResponse.json({
      distance_km: null,
      duration_min: null,
      error: "Xəta: Google Maps API açarı yoxdur. Məsafə hesablanmadı.",
    });
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    return NextResponse.json({
      distance_km: null,
      duration_min: null,
      error: "Xəta: Google Maps API açarı yoxdur. Məsafə hesablanmadı.",
    });
  }

  return NextResponse.json({
    distance_km: Math.round((element.distance.value / 1000) * 10) / 10,
    duration_min: Math.round(element.duration.value / 60),
  });
}
