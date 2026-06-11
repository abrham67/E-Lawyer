import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";

const ProfilePage = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-dashboard-section" className="container mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">{t('profile_management.title')}</h1>
        <div className="p-4 rounded-lg bg-white shadow">{t('profile_management.body')}</div>
      </main>
    </div>
  );
};
export default ProfilePage;
