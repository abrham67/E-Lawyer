import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-dashboard-section" className="container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">404</h1>
          <p className="text-lg text-muted-foreground mb-4">Oops! Page not found</p>
          <a href="/" className="text-primary underline">
            Return to Home
          </a>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
