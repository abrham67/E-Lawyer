import { useTranslation } from 'react-i18next';

const CourtSessionsList = () => {
  const { t } = useTranslation();

  return <div className="p-8">{t('court_sessions.list_page')}</div>;
};
export default CourtSessionsList;
