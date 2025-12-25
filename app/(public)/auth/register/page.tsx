"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  ad: z.string().min(2, "Ad tələb olunur"),
  soyad: z.string().min(2, "Soyad tələb olunur"),
  email: z.string().email("Email düzgün deyil"),
  password: z.string().min(6, "Şifrə ən az 6 simvol"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const cred = await createUserWithEmailAndPassword(
      auth,
      values.email,
      values.password
    );
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      ad: values.ad,
      soyad: values.soyad,
      email: values.email,
      createdAt: serverTimestamp(),
    });
    router.push("/app");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Qeydiyyat</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="text-sm font-medium">Ad</label>
              <Input {...register("ad")} />
              {errors.ad && (
                <p className="text-xs text-red-600">{errors.ad.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Soyad</label>
              <Input {...register("soyad")} />
              {errors.soyad && (
                <p className="text-xs text-red-600">{errors.soyad.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Şifrə</label>
              <Input type="password" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Qeydiyyatdan keç
            </Button>
          </form>
          <div className="mt-4 text-sm text-slate-600">
            Hesabın var?{" "}
            <Link href="/auth/login" className="text-emerald-700">
              Daxil ol
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
