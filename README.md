# Nockchain Multisig

Multisig transaction builder for Nockchain.

## How It Works

### Nockchain Multisig Concepts

In Nockchain:
- **Notes** are UTXOs (unspent transaction outputs)
- Each Note's spendability is governed by its **Lock**
- A Note is identified by `[first_name, last_name]` where `first_name` = hash of the Lock
- **%pkh** lock primitive governs how many signatures are needed to spend

For a multisig lock (e.g., 2-of-3):
- The Lock is defined by threshold + signer PKHs
- All Notes belonging to this multisig share the same `first_name` (lock hash)
- Any signer can query notes for the multisig using this lock hash

## Usage Flow

### 1. Connect Wallet
- Click "Connect Wallet" to connect Iris Wallet extension(not tested with real funds atleast!!!)
- Or use "Test Mode" for development/testing

### 2. Create/Select Multisig Account
- Expand "Multisig Accounts" in the sidebar
- Click "Create Multisig Account"
- Enter:
  - **Name**: Friendly name (e.g., "Treasury")
  - **Threshold**: Number of signatures required (M)
  - **Signers**: Public key hashes of all signers (N)
- The app computes the lock hash and fetches notes for that multisig

### 3. Build Transaction
- **Step 1 - Inputs**: Select notes (UTXOs) to spend from the multisig
- **Step 2 - Outputs**: Add recipient addresses and amounts
- **Step 3 - Review**: Verify transaction details (multisig signers are auto-populated)
- Click "Build & Sign" to create the transaction

### 4. Sign Transaction
- The transaction appears in the "Sign" tab
- If you're a configured signer, click "Sign" to add your signature
- **Export** the transaction to share with co-signers
- Co-signers import and add their signatures

### 5. Broadcast
- Once threshold signatures are collected, the "Broadcast" button enables
- Click to submit the transaction to the network

## Test Mode

Test mode allows development without the Iris Wallet extension:
- Creates mock notes for testing
- When a multisig account is active, test notes belong to that multisig lock
- Signatures are simulated (random bytes)

## Tech Stack

- React 19 + TypeScript
- Vite
- Zustand (state management)
- Tailwind CSS
- @nockbox/iris-sdk (wallet integration)
- @nockbox/iris-wasm (Nockchain transaction logic)

## Requirements

- Node.js 18+
- Iris Wallet browser extension (for production use)

## To run 

```bash
npm run dev
```

Open http://localhost:5173
