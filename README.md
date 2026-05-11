# Veil — Private Payment Rails for AI Agents on Solana

> **Colosseum Frontier Hackathon — Privacy Track**  
> MagicBlock + ST MY + SNS

---

## The Problem

AI agents are now autonomous economic actors. They pay for data APIs, market signals, and on-chain services using x402-style micropayments — and every payment is fully public on Solana.

**This creates a commercial intelligence surveillance attack:**

```
Competitor watches the chain:
  Agent paid MarketDataCo → 0.01 USDC  (12:01 AM)
  Agent paid MarketDataCo → 0.01 USDC  (12:01 AM + 15 min)
  Agent paid SignalProvider → 0.05 USDC (market open)

Inference: Agent is running an HFT strategy using signal X.
Result:    Competitor front-runs the agent. Strategy alpha destroyed.
```

Every payment leaks: **who** the agent pays, **how much**, and **how often** — enough to reverse-engineer its entire trading strategy. This is an unsolved attack surface in the agentic economy.

---

## The Solution

**Veil** routes agent payments through [MagicBlock's Private Ephemeral Rollup (PER)](https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/api-reference/per/introduction).

To a chain observer, the agent "did something" — but not what, with whom, or how much. Veil adds two additional primitives on top of PER:

1. **Shielded payment proof** — a cryptographic receipt the agent presents to paid APIs, without exposing the payment details on-chain.
2. **Session rotation** — the agent rotates to a fresh ephemeral keypair between payments, breaking any cross-payment identity linkage.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  AI Agent   │────▶│   Veil SDK   │────▶│  MagicBlock PER API     │
│             │     │  veil/index  │     │  payments.magicblock.app │
└─────────────┘     └──────────────┘     └────────────┬────────────┘
                          │                            │
                          │                 ┌──────────▼──────────────┐
                          │                 │  Private Ephemeral       │
                          │                 │  Rollup (PER)            │
                          │                 │  ┌─────────────────────┐ │
                          │                 │  │ Intel TDX TEE       │ │
                          │                 │  │ Shielded State      │ │
                          │                 │  │ Encrypted Transfers │ │
                          │                 │  └─────────────────────┘ │
                          │                 └──────────┬───────────────┘
                          │                            │
                          ▼                 ┌──────────▼──────────────┐
                   Payment Proof            │  Solana Devnet           │
                   (opaque to observers)    │  (base chain — only      │
                                           │   rollup activity visible)│
                                           └─────────────────────────┘
```

**Data API flow:**

```
Agent ──shieldedPay()──▶ Veil ──▶ PER ──▶ Settlement
                                              │
Agent ◀── payment proof ◀─────────────────────┘
  │
  └──[x-payment-proof header]──▶ Paid API ──▶ Signal data
```

---

## How It Works

1. **Authenticate** — Agent signs a PER challenge with its keypair to obtain a bearer token. No gas, no on-chain activity.

2. **Deposit** — Agent calls `POST /deposit` to move USDC from base Solana into the shielded PER environment. The unsigned transaction is returned, signed by the agent, and broadcast.

3. **Private transfer** — Agent calls `POST /transfer` with `private: true`. Inside the TEE, recipient and amount are never exposed. The API returns an unsigned private transfer transaction.

4. **Payment proof** — Agent signs the transfer transaction. The signature becomes an opaque payment proof — cryptographic but revealing nothing about amount or recipient.

5. **API access** — Agent presents the proof in `x-payment-proof` header to paid data APIs. APIs validate proof existence; they don't need on-chain data.

6. **Session rotation** — Agent generates a fresh ephemeral keypair and re-authenticates. Cross-payment identity linkage is broken.

---

## Quick Start

```bash
npm install
cp .env .env.local  # edit if needed
```

**Terminal 1 — Start the mock paid data API:**
```bash
node mock-api/server.js
```

**Terminal 2 (optional) — Start the surveillance monitor (attacker view):**
```bash
node demo/surveillance.js
```

**Terminal 3 — Run the agent demo:**
```bash
node agent/index.js
```

The demo runs end-to-end in under 60 seconds and shows:
- A public payment with full on-chain exposure (attacker sees everything)
- The same payment shielded through Veil (attacker sees nothing useful)
- Session rotation for post-payment identity privacy

---

## Project Structure

```
veil/
├── .env                    # RPC, API base URL, USDC mint
├── package.json            # ES modules, all dependencies
├── mock-api/
│   └── server.js           # Paid data API simulator (x402-style)
├── veil/
│   └── index.js            # Core Veil SDK (PER integration)
├── agent/
│   └── index.js            # Demo AI agent using Veil
└── demo/
    └── surveillance.js     # Attacker chain monitor
```

---

## MagicBlock Integration

| Component | Detail |
|---|---|
| API | `https://payments.magicblock.app` |
| Auth | Challenge / Ed25519 sign / Bearer token |
| Network | Solana devnet |
| USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Privacy model | Intel TDX TEE — shielded state inside PER |
| Key endpoints | `/challenge`, `/login`, `/deposit`, `/transfer`, `/withdraw`, `/private-balance` |

Veil wraps the full auth + payment lifecycle in a single `shieldedPay()` call. The SDK handles challenge signing, bearer token management, unsigned transaction decoding, and local Ed25519 signing.

---

## Privacy Comparison

|                 | Regular Payment  | Veil + PER         |
|-----------------|------------------|--------------------|
| Recipient       | ✅ Exposed       | 🔒 Shielded        |
| Amount          | ✅ Exposed       | 🔒 Shielded        |
| Frequency       | ✅ Exposed       | 🔒 Shielded        |
| Agent Identity  | ✅ Exposed       | 🔒 Rotated         |
| Strategy Risk   | ⚠️  HIGH         | ✅ ELIMINATED      |

---

## Track

**Colosseum Frontier Hackathon — Privacy Track**  
Sponsors: MagicBlock · ST MY · SNS
