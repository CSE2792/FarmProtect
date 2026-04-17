import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Droplets, Satellite, ShieldCheck, BarChart3 } from "lucide-react";
import Layout from "@/components/Layout";
import heroImage from "@/assets/hero-farming.jpg";

const features = [
  {
    icon: Satellite,
    title: "Satellite Detection",
    desc: "Automatically detect waterlogged areas using satellite imagery and AI.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analysis",
    desc: "Get instant results on the percentage of affected agricultural land.",
  },
  {
    icon: ShieldCheck,
    title: "Smart Insurance",
    desc: "Automated insurance claim processing based on detection results.",
  },
];

const Index = () => (
  <Layout>
    {/* Hero */}
    <section className="relative overflow-hidden">
      <div className="container grid gap-10 py-16 md:py-24 lg:grid-cols-2 lg:gap-16 items-center">
        <div className="space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
            <Droplets className="h-4 w-4" />
            Smart Agriculture Protection
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Water Logging Detection & Smart Insurance
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            Protect your farmland with AI-powered satellite monitoring. Detect waterlogging early and process insurance claims automatically.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/dashboard">
              <Button size="lg" className="text-base px-8 py-6">
                Check Water Logging
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="lg" className="text-base px-8 py-6">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <img
            src={heroImage}
            alt="Aerial view of agricultural farmland with satellite monitoring"
            className="rounded-2xl shadow-xl w-full object-cover aspect-video"
            width={1280}
            height={720}
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/40 to-transparent" />
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="bg-muted/50 py-16 md:py-24">
      <div className="container">
        <h2 className="text-center text-3xl font-bold mb-12">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl bg-card p-8 shadow-sm border text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                <f.icon className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Index;
