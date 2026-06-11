import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

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
          <p className="text-lg text-muted-foreground mb-4">{t('not_found.message')}</p>
          <a href="/" className="text-primary underline">
            {t('not_found.home')}
          </a>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
