import { Droplets } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container py-10 grid gap-8 md:grid-cols-3">
      <div>
        <div className="flex items-center gap-2 font-bold text-lg text-primary mb-3">
          <Droplets className="h-5 w-5" />
          AquaGuard
        </div>
        <p className="text-sm text-muted-foreground">
          Automated water logging detection and smart insurance for farmers.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Quick Links</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Home</li>
          <li>About</li>
          <li>Dashboard</li>
          <li>Contact</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Contact</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>support@aquaguard.in</li>
          <li>+91 1800 XXX XXXX</li>
          <li>Ministry of Agriculture, India</li>
        </ul>
      </div>
    </div>
    <div className="border-t py-4 text-center text-xs text-muted-foreground">
      © 2026 AquaGuard. All rights reserved.
    </div>
  </footer>
);

export default Footer;
