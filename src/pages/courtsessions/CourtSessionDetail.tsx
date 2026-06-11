import { useTranslation } from 'react-i18next';

const CourtSessionDetail = () => {
  const { t } = useTranslation();

  return <div className="p-8">{t('court_sessions.detail_page')}</div>;
};
export default CourtSessionDetail;
