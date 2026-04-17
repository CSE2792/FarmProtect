import Layout from "@/components/Layout";
import { Satellite, ShieldCheck, Users, Leaf } from "lucide-react";

const About = () => (
  <Layout>
    <section className="container py-16 md:py-24 max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">About AquaGuard</h1>
        <p className="text-lg text-muted-foreground">
          A smart system to detect waterlogging in agricultural land using satellite imagery and automate insurance claim processing for farmers.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {[
          { icon: Satellite, title: "AI-Powered Detection", desc: "Uses satellite images and machine learning to identify waterlogged areas accurately." },
          { icon: ShieldCheck, title: "Automated Claims", desc: "Insurance claims are processed automatically based on damage assessment." },
          { icon: Users, title: "Farmer-First Design", desc: "Simple, accessible interface designed for farmers in rural areas." },
          { icon: Leaf, title: "Government Backed", desc: "Integrated with government crop insurance schemes for seamless coverage." },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-6 space-y-3">
            <item.icon className="h-8 w-8 text-primary" />
            <h3 className="font-semibold text-lg">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  </Layout>
);

export default About;
