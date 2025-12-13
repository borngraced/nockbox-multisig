# Notes

Why do we skip TxBuilder.validate() and only call build()?
- validate() is stricter, expects signatures, checks fees
- build() just constructs the transaction
- For unsigned multisig transactions, validate() would fail

Why do we store noteHash instead of calling note.hash()?
- Calling note.hash() on notes deserialized from protobuf may fail
- We store noteHash string when first receiving the note
- Then use new wasm.Digest(noteHash) instead

Why is recipientDigest the firstName() of spend condition?
- The seed expects a digest, not a raw address
- firstName() gives us the lock hash for the recipient

Why are seeds only added to the first spend?
- All outputs go on first spend
- Other input notes just contribute to total with refunds computed

Why do we include noteProtobufs in export?
- Co-signers don't have original notes in their wallet
- They need the protobufs to sign the transaction

Is fee calculation correct for multisig?
- calcFee() docs say it might be incorrect for multisig
- Need to verify

Should we use simpleSpend instead of manual SpendBuilder?
- simpleSpend has different behavior with same recipient/refund
- Currently using manual approach

When should include_lock_data be true?
- It adds %lock key to note-data
- Costs 1 << 15 nicks
- Currently set to false
