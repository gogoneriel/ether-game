/** Ambient Vite env for root `tsc` (CI typecheck) without requiring vite in root node_modules. */
interface ImportMetaEnv {
  readonly VITE_ENABLE_MULTIPLAYER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
