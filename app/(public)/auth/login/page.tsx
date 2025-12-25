"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Email düzgün deyil"),
  password: z.string().min(6, "Şifrə ən az 6 simvol"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await signInWithEmailAndPassword(auth, values.email, values.password);
    router.push("/app");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Daxil ol</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
              Daxil ol
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
            <Link href="/auth/forgot" className="text-emerald-700">
              Şifrəni unutmusunuz?
            </Link>
            <div>
              Hesabın yoxdur?{" "}
              <Link href="/auth/register" className="text-emerald-700">
                Qeydiyyatdan keç
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
