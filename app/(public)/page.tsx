import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-lg font-semibold text-emerald-700">
            Green Guide Karabakh
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="outline">Daxil ol</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Qeydiyyatdan keç</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-slate-900">
              Green Guide Karabakh
            </h1>
            <p className="text-lg text-slate-600">
              Qarabağda səyahətini ağıllı planla, vaxtını optimallaşdır,
              davamlı turizmi dəstəklə.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth/register">
                <Button size="lg">Qeydiyyatdan keç</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg">
                  Daxil ol
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm uppercase tracking-wide text-emerald-600">
              Qarabağ görüntüləri üçün yer tutucu
            </p>
            <div className="mt-4 h-64 rounded-xl bg-gradient-to-br from-emerald-100 to-slate-200" />
          </div>
        </div>
      </section>

      <section className="container pb-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Planlama",
              desc: "Gəliş saatına görə gündəlik planını qur və vaxt itkisini azald.",
            },
            {
              title: "Heatmap",
              desc: "Top məkanları gör, axınları analiz et, smart marşrut seç.",
            },
            {
              title: "Yaşıl göstəricilər",
              desc: "Eko həssaslığı və davamlılıq indekslərini müqayisə et.",
            },
            {
              title: "Rezerv/Bron",
              desc: "Restoran və məkanlara mock rezerv və bron əlavə et.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="container flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            Əlaqə: hello@greenguide.az
          </div>
          <Link href="mailto:partners@greenguide.az">
            <Button variant="outline">Partnyor ol</Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}
