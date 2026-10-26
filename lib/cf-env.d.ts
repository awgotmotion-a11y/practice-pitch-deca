// Just the Cloudflare bindings the API route uses (see cloudflare.config.ts).
// ponytail: hand-typed to keep workerd's global types away from the browser code; add ".cloudflare/types" to tsconfig if more bindings arrive.
type D1Stmt = {
  bind(...values: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};
type D1 = { prepare(sql: string): D1Stmt; batch(stmts: D1Stmt[]): Promise<unknown[]> };

declare module "cloudflare:workers" {
  export const env: {
    AI: {
      run(model: string, input: Record<string, unknown>): Promise<unknown>;
      toMarkdown(doc: { name: string; blob: Blob }): Promise<{ format: "markdown" | "text" | "error"; data?: string; error?: string }>;
    };
    USAGE: {
      get(key: string): Promise<string | null>;
      put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
    };
    DB: D1;
  };
}
