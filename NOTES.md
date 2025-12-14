# Notes

Why do we skip TxBuilder.validate() and only call build()?
- validate() is stricter, expects signatures, checks fees
- build() just constructs the transaction
- For unsigned multisig transactions, validate() would fail
- [build-transaction.ts#L439](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L439)

Why do we store noteHash instead of calling note.hash()?
- Calling note.hash() on notes deserialized from protobuf may fail
- We store noteHash string when first receiving the note
- Then use new wasm.Digest(noteHash) instead
- [wallet-service.ts#L133-L139](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/wallet/wallet-service.ts#L133-L139)

Why is recipientDigest the firstName() of spend condition?
- The seed expects a digest, not a raw address
- firstName() gives us the lock hash for the recipient
- [build-transaction.ts#L377-L382](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L377-L382)

Why are seeds only added to the first spend?
- All outputs go on first spend
- Other input notes just contribute to total with refunds computed
- iris-wasm merges all refunds with the same lock into one output automatically
- [build-transaction.ts#L360](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L360)

Why does isBalanced() fail on subsequent spends?
- isBalanced() checks: note.assets == seeds + fee
- Subsequent spends have no seeds (all on first spend), so: input != 0 + fee
- isBalanced() is only required for validate(), not build()
- Fix: Skip isBalanced() check, use computeRefund() + build() only
- [build-transaction.ts#L413-L425](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L413-L425)

Why does setFeeAndBalanceRefund() fail for multi-input?
- It expects an internal note pool (used by simpleSpend)
- Manual SpendBuilder approach doesn't maintain a note pool
- Fix: Use computeRefund() on each spend instead

Why do we include noteProtobufs in export?
- Co-signers don't have original notes in their wallet
- They need the protobufs to sign the transaction
- [use-signing.ts#L243](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/signing/use-signing.ts#L243)

When should include_lock_data be true?
- It adds %lock key to note-data
- Costs 1 << 15 nicks
- Only needed if recipients need to inspect lock structure on-chain
- Currently set to false (correct for standard transfers)
- [build-transaction.ts#L390](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L390)

Should we use simpleSpend instead of manual SpendBuilder?
- iris-wasm: "It is HIGHLY recommended to not mix simpleSpend with other types of spends"
- simpleSpend mimics nockchain CLI wallet's create-tx behavior
- Manual SpendBuilder gives more control for multisig scenarios
- Decision: Use manual SpendBuilder
- [iris-rs tx.rs#L1074-L1106](https://github.com/nockbox/iris-rs/blob/945b943fbb971b3df7349ab94984c09391a77c27/crates/iris-wasm/src/tx.rs#L1074-L1106)

## Open Questions

Is fee estimation accurate for multisig?
- Current calculation uses fixed sizes
- Does not account for multiple signatures in multisig (threshold signatures vs single-sig)
- May underestimate fees for high-threshold multisigs
- [use-transaction-builder.ts#L85-L91](https://github.com/borngraced/nockbox-multisig/blob/main/src/shared/hooks/use-transaction-builder.ts#L85-L91)
