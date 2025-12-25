"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Yüklənir...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Sessiya yoxdur.</p>
        <Button onClick={() => router.push("/auth/login")}>
          Daxil ol
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
