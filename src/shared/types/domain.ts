declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export const NOCK_TO_NICKS = 65536n;

export type Nicks = Brand<bigint, "Nicks">;
export type Digest = Brand<string, "Digest">;

export const Nicks = {
  fromBigInt: (value: bigint): Nicks => {
    if (value < 0n) throw new Error("Nicks cannot be negative");
    return value as Nicks;
  },
  fromNock: (nock: number): Nicks => (BigInt(nock) * 65536n) as Nicks,
  toNock: (nicks: Nicks): number => Number(nicks / 65536n),
  ZERO: 0n as Nicks,
} as const;
