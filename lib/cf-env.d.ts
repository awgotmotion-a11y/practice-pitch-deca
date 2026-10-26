// Just the Cloudflare bindings the API route uses (see cloudflare.config.ts).
// ponytail: hand-typed to keep workerd's global types away from the browser code; add ".cloudflare/types" to tsconfig if more bindings arrive.
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
    BETA_ACCESS_CODE?: string;
  };
}
