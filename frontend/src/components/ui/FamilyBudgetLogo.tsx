import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/auth/currency';

type Size = 'sm' | 'md' | 'lg';

interface SizeConfig {
  icon: number;
  wordmark: number;
  subtitle: number;
  gap: number;
  subtitleMt: number;
  wordmarkGap: number;
}

const sizeConfig: Record<Size, SizeConfig> = {
  sm: { icon: 24,  wordmark: 14, subtitle: 7,  gap: 6,  subtitleMt: 2, wordmarkGap: 2 },
  md: { icon: 48,  wordmark: 28, subtitle: 13, gap: 12, subtitleMt: 4, wordmarkGap: 3 },
  lg: { icon: 96,  wordmark: 42, subtitle: 19, gap: 20, subtitleMt: 6, wordmarkGap: 5 },
};

function HouseIcon({ size, currencySymbol }: { size: number; currencySymbol: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Fond cercle */}
      <circle cx="50" cy="50" r="50" fill="#2D9B6F" />
      {/* Corps de la maison */}
      <rect x="28" y="50" width="44" height="30" fill="#1A7A52" />
      {/* Toit */}
      <polygon points="50,18 84,52 16,52" fill="#1A7A52" />
      {/* Porte centrée */}
      <rect x="41" y="63" width="18" height="17" rx="1" fill="#2D9B6F" />
      {/* Symbole devise blanc centré */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
        fontSize="19"
        fontWeight="bold"
      >
        {currencySymbol}
      </text>
    </svg>
  );
}

interface FamilyBudgetLogoProps {
  size?: Size;
}

export function FamilyBudgetLogo({ size = 'md' }: FamilyBudgetLogoProps) {
  const { t } = useTranslation();
  const { currencySymbol } = useCurrency();
  const c = sizeConfig[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: c.gap }}>
      <HouseIcon size={c.icon} currencySymbol={currencySymbol} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Wordmark */}
        <div style={{ fontSize: c.wordmark, fontWeight: 500, lineHeight: 1 }}>
          <span className="text-base-content">Family</span>
          <span style={{ color: '#2D9B6F' }}>Budget</span>
        </div>
        {/* Sous-titre i18n */}
        <span
          className="text-base-content/60"
          style={{
            fontSize: c.subtitle,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginTop: c.subtitleMt,
          }}
        >
          {t('logo.subtitle')}
        </span>
      </div>
    </div>
  );
}
