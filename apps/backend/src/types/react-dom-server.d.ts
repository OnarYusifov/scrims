/**
 * Type declarations for react-dom/server module
 * This is needed because @types/react-dom doesn't include server types properly
 */

declare module "react-dom/server" {
  export function renderToReadableStream(
    element: React.ReactElement,
    options?: {
      identifierPrefix?: string;
      namespaceURI?: string;
      nonce?: string;
      bootstrapScriptContent?: string;
      bootstrapScripts?: string[];
      bootstrapModules?: string[];
      progressiveChunkSize?: number;
      signal?: AbortSignal;
      onError?: (error: unknown) => void;
    }
  ): ReadableStream<Uint8Array>;

  export function renderToString(element: React.ReactElement): string;
  export function renderToStaticMarkup(element: React.ReactElement): string;
  export function renderToPipeableStream(
    element: React.ReactElement,
    options?: {
      identifierPrefix?: string;
      namespaceURI?: string;
      nonce?: string;
      bootstrapScriptContent?: string;
      bootstrapScripts?: string[];
      bootstrapModules?: string[];
      progressiveChunkSize?: number;
      signal?: AbortSignal;
      onError?: (error: unknown) => void;
    }
  ): {
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    abort(): void;
  };
}
