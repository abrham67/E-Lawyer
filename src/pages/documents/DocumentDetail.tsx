import { useTranslation } from 'react-i18next';
import Navbar from "@/components/Navbar";

const DocumentDetail = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-dashboard-section" className="container mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">{t('documents_placeholder.detail_title')}</h1>
        <div className="p-4 rounded-lg bg-white shadow">{t('documents_placeholder.detail_page')}</div>
      </main>
    </div>
  );
};
export default DocumentDetail;
