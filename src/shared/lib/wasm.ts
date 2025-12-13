import { wasm } from '@nockbox/iris-sdk';

let initPromise: Promise<unknown> | null = null;

export async function initWasm(): Promise<void> {
  if (!initPromise) {
    initPromise = wasm.default();
  }
  await initPromise;
}

export { wasm };
