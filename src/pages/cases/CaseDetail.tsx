import { useTranslation } from 'react-i18next';

const CaseDetail = () => {
  const { t } = useTranslation();

  return <div className="p-8">{t('cases_list.detail_page')}</div>;
};
export default CaseDetail;
