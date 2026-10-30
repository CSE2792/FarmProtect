import { Link, useLocation } from "react-router-dom";
import { Droplets, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const links = location.pathname.startsWith("/admin")
    ? [{ to: "/admin", label: "Insurance Approval" }]
    : [
        { to: "/", label: "Home" },
        { to: "/about", label: "About" },
        { to: "/dashboard", label: "Dashboard" },
      ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
          <Droplets className="h-6 w-6" />
          <span>Farm Protect</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === l.to ? "text-primary" : "text-muted-foreground"
                }`}
            >
              {l.label}
            </Link>
          ))}
          
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Link to={location.pathname.startsWith("/admin") ? "/admin-login" : "/login"}>
              <Button size="sm">Login</Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-card p-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { signOut(); setOpen(false); }}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Link to={location.pathname.startsWith("/admin") ? "/admin-login" : "/login"} onClick={() => setOpen(false)}>
              <Button className="w-full">Login</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
