declare module 'next' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Metadata = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Viewport = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const NextConfig: any;
}

declare module 'next/font/google' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function Playfair_Display(options?: any): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function Be_Vietnam_Pro(options?: any): any;
}

declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type ResolvingMetadata = unknown;
  export type ResolvingViewport = unknown;
}

declare module 'next/server.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const NextResponse: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type NextResponse = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const NextRequest: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type NextRequest = any;
}

declare module 'next/link' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link: any;
  export default Link;
}

declare module 'next/link.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link: any;
  export default Link;
}

declare module 'next/navigation' {
  export function useRouter(): {
    push(url: string): void;
    replace(url: string): void;
    refresh(): void;
    back(): void;
    forward(): void;
    prefetch(url: string): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function notFound(): never;
  export function redirect(url: string): never;
}

declare module 'next/navigation.js' {
  export function useRouter(): {
    push(url: string): void;
    replace(url: string): void;
    refresh(): void;
    back(): void;
    forward(): void;
    prefetch(url: string): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function notFound(): never;
  export function redirect(url: string): never;
}

declare module 'next/image' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Image: any;
  export default Image;
}

declare module 'next/image.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Image: any;
  export default Image;
}

declare module 'next/server' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const NextResponse: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type NextResponse = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const NextRequest: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type NextRequest = any;
}

declare module 'next/headers' {
  export function cookies(): Promise<{
    get(name: string): { name: string; value: string } | undefined;
    getAll(): { name: string; value: string }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(name: string, value: string, options?: any): void;
    delete(name: string): void;
  }>;
  export function headers(): Promise<Headers>;
}
