/// <reference types="vite/client" />

interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_BUILD_TYPE: string;
  readonly VITE_API_URL: string;
  readonly VITE_GIT_SHA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
