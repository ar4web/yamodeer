/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAIL_AI_ENDPOINT?: string;
  readonly VITE_MAIL_OAUTH_START_URL?: string;
  readonly VITE_WORKHUB_LOCAL_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:tailwind.css";
