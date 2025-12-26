"use client";

import React from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HeatmapPage() {
  const [imageError, setImageError] = React.useState<{ [key: string]: boolean }>({});

  const heatmapImages = [
    { id: 1, src: "/heatmap1.jpeg", alt: "Heatmap 1" },
    { id: 2, src: "/heatmap2.jpeg", alt: "Heatmap 2" },
    { id: 3, src: "/heatmap3.jpeg", alt: "Heatmap 3" },
    { id: 4, src: "/heatmap4.jpeg", alt: "Heatmap 4" },
  ];

  const handleImageError = (id: number) => {
    setImageError((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ziyarətçi Heatmapı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm text-slate-600">
              <p>Qarabağ bölgəsində turist axınının sıxlığını göstərən heatmap analizi.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {heatmapImages.map((image) => (
                <div key={image.id} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  {!imageError[image.id] ? (
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-auto object-cover"
                      onError={() => handleImageError(image.id)}
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
                      <div className="text-center">
                        <p className="font-medium mb-1">Şəkil tapılmadı</p>
                        <p className="text-xs">{image.src}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
              <p className="font-medium mb-2">Heatmap Nədir?</p>
              <p>Heatmap, turist ziyarətçilerinin ən çox cəlb olduğu məkanları rəng intensivliyi ilə göstərən vizual xəritədir. Qırmızı rənglər yüksək ziyarətçi sayını, mavi rənglər isə düşük ziyarətçi sayını təmsil edir.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
