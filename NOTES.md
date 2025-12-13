# Development Notes

Technical notes and uncertainties discovered during development.

---

## WASM API Notes

### TxBuilder.validate() vs TxBuilder.build()

**Finding**: `build()` does NOT perform the same validation as `validate()`.

**Details**:
- `validate()` is stricter and checks:
  1. All spends are balanced (via `SpendBuilder.isBalanced()`)
  2. Fees are correct/sufficient
  3. May expect signatures to be in place
- `build()` simply constructs the `NockchainTx` object without these strict checks

**Evidence from iris-wasm types**:
```typescript
// SpendBuilder.isBalanced() comment:
/**
 * Checks whether note.assets = seeds + fee
 *
 * This function needs to return true for `TxBuilder::validate` to pass
 */
isBalanced(): boolean;

// simpleSpend docs mention:
// "Another difference is that you should call `sign` and `validate` after calling this method."
```

**Implication**: For multisig transactions where we build unsigned transactions for later signing, we skip `validate()` and only call `build()`. The validation would fail on unsigned transactions.

**Location**: `src/features/transaction/build-transaction.ts`

---

### Note.hash() on Deserialized Notes

**Finding**: Calling `note.hash()` on notes deserialized from protobuf may fail.

**Workaround**: Store the `noteHash` string when first creating/receiving the note, then use `new wasm.Digest(noteHash)` instead of calling `note.hash()`.

**Location**:
- `src/features/wallet/wallet-store.ts` - `WalletNote.noteHash` field
- `src/features/wallet/wallet-service.ts` - stores hash at mapping time

---

## Transaction Building

### Seed Creation for Recipients

**Current approach**:
```typescript
const recipientPkh = wasm.Pkh.single(output.recipientAddress);
const recipientSpendCondition = wasm.SpendCondition.newPkh(recipientPkh);
const recipientDigest = recipientSpendCondition.firstName();

const seed = wasm.Seed.newSinglePkh(
  recipientDigest,
  BigInt(output.amount),
  parentHash,
  false  // include_lock_data
);
```

**Note**: The `recipientDigest` is the `firstName()` of the spend condition, not the raw address.

---

### Multiple Outputs Handling

Seeds for all outputs are added to the **first spend only**. Subsequent spends (from additional input notes) only contribute to the total and have refunds computed.

```typescript
if (i === 0) {
  for (const output of draft.outputs) {
    // Add seeds here
  }
}
```

---

## Export Format

### Version 1

Current export version includes:
- `noteProtobufs` - Required for co-signers to sign
- `spendConditionProtobufs` - Required for co-signers to sign

These fields are required because co-signers won't have the original notes in their wallet store.

---

## Open Questions

### 1. Fee Calculation for Multisig

The `calcFee()` docs state:
> "If you're building a multisig transaction, this value might be incorrect."

Need to verify if fee calculation is accurate for m-of-n multisig scenarios.

### 2. simpleSpend vs Manual Spend Building

Currently using manual `SpendBuilder` approach. The `simpleSpend` API might be simpler but has different behavior:
> "if `recipient` is the same as `refund_pkh`, we will create 1 seed, while the CLI wallet will create 2."

Consider if `simpleSpend` would be more appropriate.

### 3. include_lock_data Parameter

The `include_lock_data` parameter adds `%lock` key to note-data but costs 1 << 15 nicks. Currently set to `false`. Need to understand when this should be `true`.
