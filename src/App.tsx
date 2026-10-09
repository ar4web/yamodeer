import React from "react";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { GeofencingSafetyProvider } from "@/context/RBACGeofenceContext";
import { OperationsProvider } from "@/context/OperationsContext";
import { WorkHubProvider } from "@/context/WorkHubContext";
import { MailProvider } from "@/context/MailContext";
import { CollaborationProvider } from "@/context/CollaborationContext";
import { NotificationCenterProvider } from "@/context/NotificationCenterContext";
import { MasterShell } from "@/components/MasterShell";

const ProductionReadinessGate: React.FC = () => {
  const { t } = useLanguage();
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12 text-foreground">
      <section
        role="alert"
        aria-labelledby="production-readiness-title"
        className="w-full max-w-2xl border border-theme bg-surface p-8 shadow-card"
      >
        <div className="mb-5 h-1 w-12 bg-warning" aria-hidden="true" />
        <h1
          id="production-readiness-title"
          className="mb-3 text-dynamic-2xl font-extrabold text-foreground"
        >
          {t("app.production_gate.title")}
        </h1>
        <p className="text-dynamic-base leading-relaxed text-muted">
          {t("app.production_gate.body")}
        </p>
      </section>
    </main>
  );
};

export const App: React.FC = () => {
  const application = (
    <GeofencingSafetyProvider>
      <OperationsProvider>
        <CollaborationProvider>
          <WorkHubProvider>
          <MailProvider>
            <NotificationCenterProvider>
              <MasterShell />
            </NotificationCenterProvider>
          </MailProvider>
          </WorkHubProvider>
        </CollaborationProvider>
      </OperationsProvider>
    </GeofencingSafetyProvider>
  );

  return (
    <LanguageProvider>
      <ThemeProvider>
        {/* Remove this fail-closed guard only after server auth and durable core APIs are live. */}
        {import.meta.env.PROD ? <ProductionReadinessGate /> : application}
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
