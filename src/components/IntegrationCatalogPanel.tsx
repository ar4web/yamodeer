import React from "react";
import {
  type LucideIcon,
  BriefcaseBusiness,
  Building2,
  Database,
  ExternalLink,
  HeartPulse,
  Landmark,
  Receipt,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { PrototypeNotice, surfaceClassName } from "@/components/DesignSystem";

type IntegrationCategory = "labor" | "payroll" | "residency" | "insurance" | "open_data";

type IntegrationEntry = {
  id: string;
  category: IntegrationCategory;
  titleKey: string;
  descriptionKey: string;
  applicabilityKey: string;
  accessKey: string;
  url: string;
  icon: LucideIcon;
};

const INTEGRATIONS: IntegrationEntry[] = [
  {
    id: "qiwa",
    category: "labor",
    titleKey: "set.integrations.qiwa.title",
    descriptionKey: "set.integrations.qiwa.description",
    applicabilityKey: "set.integrations.qiwa.applies",
    accessKey: "set.integrations.qiwa.access",
    url: "https://www.hrsd.gov.sa/en/media-center/news/%D8%AA%D9%88%D8%AB%D9%8A%D9%82-%D8%B9%D9%82%D9%88%D8%AF-%D8%A7%D9%84%D8%B9%D9%85%D9%84-%D8%A5%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A7%D9%8B",
    icon: BriefcaseBusiness
  },
  {
    id: "gosi",
    category: "labor",
    titleKey: "set.integrations.gosi.title",
    descriptionKey: "set.integrations.gosi.description",
    applicabilityKey: "set.integrations.gosi.applies",
    accessKey: "set.integrations.gosi.access",
    url: "https://www.gosi.gov.sa/GOSIOnline/E-Services_Channels?locale=en_US",
    icon: ShieldCheck
  },
  {
    id: "mudad",
    category: "payroll",
    titleKey: "set.integrations.mudad.title",
    descriptionKey: "set.integrations.mudad.description",
    applicabilityKey: "set.integrations.mudad.applies",
    accessKey: "set.integrations.mudad.access",
    url: "https://mudad.com.sa/",
    icon: WalletCards
  },
  {
    id: "zatca",
    category: "payroll",
    titleKey: "set.integrations.zatca.title",
    descriptionKey: "set.integrations.zatca.description",
    applicabilityKey: "set.integrations.zatca.applies",
    accessKey: "set.integrations.zatca.access",
    url: "https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/DEVELOPER-PORTAL-MANUAL.pdf",
    icon: Receipt
  },
  {
    id: "muqeem",
    category: "residency",
    titleKey: "set.integrations.muqeem.title",
    descriptionKey: "set.integrations.muqeem.description",
    applicabilityKey: "set.integrations.muqeem.applies",
    accessKey: "set.integrations.muqeem.access",
    url: "https://elm.sa/ar/our-business/digital-products/Documents/En/Muqeem%20EN.pdf",
    icon: Building2
  },
  {
    id: "absher_business",
    category: "residency",
    titleKey: "set.integrations.absher.title",
    descriptionKey: "set.integrations.absher.description",
    applicabilityKey: "set.integrations.absher.applies",
    accessKey: "set.integrations.absher.access",
    url: "https://www.absher.sa/wps/wcm/connect/business/Business+Portal/eServices+User+Guide/Electronic+Services/",
    icon: Landmark
  },
  {
    id: "chi_nphies_hidp",
    category: "insurance",
    titleKey: "set.integrations.nphies.title",
    descriptionKey: "set.integrations.nphies.description",
    applicabilityKey: "set.integrations.nphies.applies",
    accessKey: "set.integrations.nphies.access",
    url: "https://portal.nphies.sa/ig/Beneficiary%20Discovery%20Insurance%20-%20Integration%20Guide%20V1.0.pdf",
    icon: HeartPulse
  },
  {
    id: "open_data",
    category: "open_data",
    titleKey: "set.integrations.open_data.title",
    descriptionKey: "set.integrations.open_data.description",
    applicabilityKey: "set.integrations.open_data.applies",
    accessKey: "set.integrations.open_data.access",
    url: "https://od.data.gov.sa/en/realtime-api",
    icon: Database
  }
];

const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  "labor",
  "payroll",
  "residency",
  "insurance",
  "open_data"
];

const READINESS_STEPS = [
  "set.integrations.readiness.1",
  "set.integrations.readiness.2",
  "set.integrations.readiness.3",
  "set.integrations.readiness.4",
  "set.integrations.readiness.5"
];

export const IntegrationCatalogPanel: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <section className={`${surfaceClassName} space-y-3 p-4`} aria-labelledby="settings-integrations-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-foreground">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="settings-integrations-title" className="break-words text-dynamic-lg font-bold text-foreground">
                {t("set.integrations.title")}
              </h2>
              <p className="mt-1 max-w-4xl break-words text-dynamic-xs leading-relaxed text-muted">
                {t("set.integrations.description")}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-theme bg-surface-elevated px-2.5 py-1.5 text-dynamic-xs font-semibold text-muted">
            {t("set.integrations.catalog_only")}
          </span>
        </div>
        <PrototypeNotice label={t("set.integrations.not_connected")}>
          {t("set.integrations.no_live_connections")}
        </PrototypeNotice>
      </section>

      <PrototypeNotice label={t("set.integrations.scope_note_label")}>
        {t("set.integrations.scope_note")}
      </PrototypeNotice>

      <section className={`${surfaceClassName} space-y-3 p-4`} aria-labelledby="settings-integrations-readiness">
        <h3 id="settings-integrations-readiness" className="text-dynamic-base font-bold text-foreground">
          {t("set.integrations.readiness.title")}
        </h3>
        <ol className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {READINESS_STEPS.map((step, index) => (
            <li key={step} className="flex min-w-0 items-start gap-2 border-t border-theme py-2 text-dynamic-xs leading-relaxed text-muted">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted font-bold tabular-nums text-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 break-words">{t(step)}</span>
            </li>
          ))}
        </ol>
      </section>

      {INTEGRATION_CATEGORIES.map((category) => {
        const entries = INTEGRATIONS.filter((entry) => entry.category === category);
        return (
          <section key={category} className="space-y-3" aria-labelledby={`settings-integrations-${category}`}>
            <h3 id={`settings-integrations-${category}`} className="break-words border-b border-theme pb-2 text-dynamic-base font-bold text-foreground">
              {t(`set.integrations.category.${category}`)}
            </h3>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {entries.map((entry) => {
                const Icon = entry.icon;
                return (
                  <article key={entry.id} className={`${surfaceClassName} flex min-w-0 flex-col gap-3 p-4`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted">
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="break-words text-dynamic-sm font-bold text-foreground">{t(entry.titleKey)}</h4>
                          <p className="mt-1 break-words text-dynamic-xs leading-relaxed text-muted">{t(entry.descriptionKey)}</p>
                        </div>
                      </div>
                      <span className="max-w-full break-words rounded-md border border-theme bg-surface-elevated px-2 py-1 text-center text-dynamic-xs font-semibold text-muted">
                        {t("set.integrations.not_connected")}
                      </span>
                    </div>

                    <dl className="grid grid-cols-1 gap-2 border-t border-theme pt-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                      <dt className="text-dynamic-xs font-semibold text-muted">{t("set.integrations.applies_label")}</dt>
                      <dd className="min-w-0 break-words text-dynamic-xs leading-relaxed text-foreground">{t(entry.applicabilityKey)}</dd>
                      <dt className="text-dynamic-xs font-semibold text-muted">{t("set.integrations.api_access_label")}</dt>
                      <dd className="min-w-0 break-words text-dynamic-xs leading-relaxed text-foreground">{t(entry.accessKey)}</dd>
                    </dl>

                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${t("set.integrations.official_info")}: ${t(entry.titleKey)}`}
                      className="mt-auto inline-flex min-h-10 w-full max-w-full flex-wrap items-center justify-center gap-1.5 rounded-md border border-theme px-2.5 py-2 text-dynamic-xs font-semibold text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-fit sm:justify-start sm:px-3"
                    >
                      <span className="min-w-0 break-words">{t("set.integrations.official_info")}</span>
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
