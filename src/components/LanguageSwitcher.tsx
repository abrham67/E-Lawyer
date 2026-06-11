import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type LanguageSwitcherProps = {
  className?: string;
};

function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();

  const currentLanguage = useMemo(() => {
    return i18n.language?.toLowerCase().startsWith('am') ? 'am' : 'en';
  }, [i18n.language]);

  return (
    <div className={className}>
      <Select value={currentLanguage} onValueChange={(value) => i18n.changeLanguage(value)}>
        <SelectTrigger aria-label={t('language')} className="h-9 w-[132px] bg-white text-slate-900 border-white/40">
          <SelectValue placeholder={t('language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t('english')}</SelectItem>
          <SelectItem value="am">{t('amharic')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default LanguageSwitcher;