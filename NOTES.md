# Notes

Why do we skip TxBuilder.validate() and only call build()?
- validate() is stricter, expects signatures, checks fees
- build() just constructs the transaction
- For unsigned multisig transactions, validate() would fail
- [build-transaction.ts#L444](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L444)

Why do we store noteHash instead of calling note.hash()?
- Calling note.hash() on notes deserialized from protobuf may fail
- We store noteHash string when first receiving the note
- Then use new wasm.Digest(noteHash) instead
- [wallet-service.ts#L134-L140](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/wallet/wallet-service.ts#L134-L140)

Why is recipientDigest the firstName() of spend condition?
- The seed expects a digest, not a raw address
- firstName() gives us the lock hash for the recipient
- [build-transaction.ts#L382-L384](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L382-L384)

Why are seeds only added to the first spend?
- All outputs go on first spend
- Other input notes just contribute to total with refunds computed
- [build-transaction.ts#L367](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L367)

Why do we include noteProtobufs in export?
- Co-signers don't have original notes in their wallet
- They need the protobufs to sign the transaction
- [use-signing.ts#L240-L243](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/signing/use-signing.ts#L240-L243)

When should include_lock_data be true?
- It adds %lock key to note-data
- Costs 1 << 15 nicks
- Only needed if recipients need to inspect lock structure on-chain
- Currently set to false (correct for standard transfers)
- [build-transaction.ts#L395-L397](https://github.com/borngraced/nockbox-multisig/blob/main/src/features/transaction/build-transaction.ts#L395-L397)

Should we use simpleSpend instead of manual SpendBuilder?
- iris-wasm: "It is HIGHLY recommended to not mix simpleSpend with other types of spends"
- simpleSpend mimics nockchain CLI wallet's create-tx behavior
- Manual SpendBuilder gives more control for multisig scenarios
- Decision: Use manual SpendBuilder
- [iris-rs tx.rs#L1074-L1106](https://github.com/nockbox/iris-rs/blob/945b943fbb971b3df7349ab94984c09391a77c27/crates/iris-wasm/src/tx.rs#L1074-L1106)

## Open Questions

Is fee estimation accurate for multisig?
- Current calculation uses fixed sizes: 200 bytes/input, 100 bytes/output
- Does not account for multiple signatures in multisig (threshold signatures vs single-sig)
- May underestimate fees for high-threshold multisigs
- [use-transaction-builder.ts#L99-L105](https://github.com/borngraced/nockbox-multisig/blob/main/src/shared/hooks/use-transaction-builder.ts#L99-L105)
