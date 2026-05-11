// Main Veil demo: shows an AI agent making a public payment (fully visible),
// then making the same payment through Veil's PER shielding (invisible to observers).
import { VeilAgent } from '../veil/index.js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const MOCK_API = `http://localhost:${process.env.MOCK_API_PORT || 3001}`;
const MOCK_API_WALLET = 'DemoApiWa11et1111111111111111111111111111111'; // illustrative recipient

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Banner ────────────────────────────────────────────────────────────────
function printBanner() {
  console.log(chalk.cyan.bold(`
██╗   ██╗███████╗██╗██╗
██║   ██║██╔════╝██║██║
██║   ██║█████╗  ██║██║
╚██╗ ██╔╝██╔══╝  ██║██║
 ╚████╔╝ ███████╗██║███████╗
  ╚═══╝  ╚══════╝╚═╝╚══════╝`));
  console.log(chalk.white.bold('  Privacy Layer for AI Agent Commerce on Solana'));
  console.log(chalk.gray('  Powered by MagicBlock Private Ephemeral Rollups\n'));
  console.log(chalk.gray('─'.repeat(60)));
}

// ─── Step 1 header helper ─────────────────────────────────────────────────
function step(n, label) {
  console.log(chalk.yellow.bold(`\n[${n}] ${label}`));
}

// ─── Show what a chain observer sees for a public payment ─────────────────
function showAttackerView(pubkey, recipientPubkey, amount) {
  console.log(chalk.red('\n  👁️  ATTACKER sees on-chain:'));
  console.log(chalk.red('  ┌──────────────────────────────────────────────┐'));
  console.log(chalk.red(`  │ Sender:    ${pubkey.slice(0, 20)}...          │`));
  console.log(chalk.red(`  │ Recipient: ${recipientPubkey.slice(0, 20)}...  │`));
  console.log(chalk.red(`  │ Amount:    ${amount} USDC                         │`));
  console.log(chalk.red('  │ Program:   SPL Token Transfer                │'));
  console.log(chalk.red('  │ Frequency: can be tracked over time          │'));
  console.log(chalk.red('  │ Strategy:  EXPOSED → competitor can copy you │'));
  console.log(chalk.red('  └──────────────────────────────────────────────┘'));
}

// ─── Show what a chain observer sees for a Veil-shielded payment ──────────
function showAttackerViewShielded() {
  console.log(chalk.green('\n  👁️  ATTACKER sees on-chain:'));
  console.log(chalk.green('  ┌──────────────────────────────────────────────┐'));
  console.log(chalk.green('  │ Sender:    [encrypted inside PER]            │'));
  console.log(chalk.green('  │ Recipient: [encrypted inside PER]            │'));
  console.log(chalk.green('  │ Amount:    [encrypted inside PER]            │'));
  console.log(chalk.green('  │ Program:   MagicBlock PER rollup             │'));
  console.log(chalk.green('  │ Frequency: not determinable                  │'));
  console.log(chalk.green('  │ Strategy:  PROTECTED ✅                      │'));
  console.log(chalk.green('  └──────────────────────────────────────────────┘'));
}

// ─── Final comparison table ───────────────────────────────────────────────
function printComparisonTable() {
  console.log(chalk.white.bold('\n  Privacy Comparison: Regular vs Veil + PER\n'));
  const T = chalk.gray;
  const E = chalk.red;
  const S = chalk.green;
  console.log(T('  ┌─────────────────┬──────────────────┬────────────────────┐'));
  console.log(T('  │') + chalk.white('                 ') + T('│') + chalk.white('  Regular Payment ') + T('│') + chalk.white('   Veil + PER       ') + T('│'));
  console.log(T('  ├─────────────────┼──────────────────┼────────────────────┤'));
  console.log(T('  │') + chalk.white(' Recipient       ') + T('│') + E(' ✅ Exposed       ') + T('│') + S(' 🔒 Shielded        ') + T('│'));
  console.log(T('  │') + chalk.white(' Amount          ') + T('│') + E(' ✅ Exposed       ') + T('│') + S(' 🔒 Shielded        ') + T('│'));
  console.log(T('  │') + chalk.white(' Frequency       ') + T('│') + E(' ✅ Exposed       ') + T('│') + S(' 🔒 Shielded        ') + T('│'));
  console.log(T('  │') + chalk.white(' Agent Identity  ') + T('│') + E(' ✅ Exposed       ') + T('│') + S(' 🔒 Rotated         ') + T('│'));
  console.log(T('  │') + chalk.white(' Strategy Risk   ') + T('│') + E(' ⚠️  HIGH         ') + T('│') + S(' ✅ ELIMINATED      ') + T('│'));
  console.log(T('  └─────────────────┴──────────────────┴────────────────────┘'));
}

// ─── Main demo ────────────────────────────────────────────────────────────
async function main() {
  printBanner();

  // ── 1. Init agent ────────────────────────────────────────────────────────
  step(1, '🤖 Initializing agent...');
  const agent = new VeilAgent({
    rpcUrl: process.env.SOLANA_RPC,
    magicblockApi: process.env.MAGICBLOCK_API,
    usdcMint: process.env.USDC_MINT,
  });

  await agent.init('./agent-keypair.json');
  const agentPubkey = agent.keypair.publicKey.toBase58();
  await sleep(600);

  // ── 2. Authenticate with PER ─────────────────────────────────────────────
  step(2, '🔐 Connecting to Private Ephemeral Rollup...');
  await agent.authenticate();
  await sleep(600);

  // ── 3. Public payment — the surveillance problem ──────────────────────────
  step(3, '📡 Attempting to buy market signal WITHOUT Veil (public payment)...');
  await sleep(400);

  console.log(chalk.gray('\n  Simulating regular Solana SPL transfer...'));
  const publicTxStructure = {
    type: 'SPL Token Transfer',
    from: agentPubkey,
    to: MOCK_API_WALLET,
    amount: '0.01 USDC',
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    visible: true,
  };
  console.log(chalk.gray(`  Tx: ${JSON.stringify(publicTxStructure)}`));

  console.log(chalk.red.bold(`\n  ⚠️  PUBLIC: Sent 0.01 USDC to ${MOCK_API_WALLET.slice(0, 20)}... — VISIBLE to all chain observers`));
  showAttackerView(agentPubkey, MOCK_API_WALLET, '0.01');
  await sleep(800);

  // ── 4. Shielded payment via Veil ──────────────────────────────────────────
  step(4, '🛡️  Now buying with Veil shielded payment...');
  await sleep(400);

  const paymentProof = await agent.shieldedPay(MOCK_API_WALLET, 0.01, 'market-signal-purchase');
  showAttackerViewShielded();

  console.log(chalk.cyan('\n  Payment proof returned to agent:'));
  console.log(chalk.cyan(`  {`));
  console.log(chalk.cyan(`    proof:           "${paymentProof.proof.slice(0, 32)}..."`));
  console.log(chalk.cyan(`    shielded:        ${paymentProof.shielded}`));
  console.log(chalk.cyan(`    visible_on_chain: ${paymentProof.visible_on_chain}`));
  console.log(chalk.cyan(`    memo:            "${paymentProof.memo}"`));
  if (paymentProof.simulated) {
    console.log(chalk.cyan(`    mode:            "simulation (PER API offline)"`));
  }
  console.log(chalk.cyan(`  }`));
  await sleep(600);

  // ── 5. Use proof to call mock data API ────────────────────────────────────
  step(5, '📊 Submitting proof to paid data API...');
  await sleep(400);

  try {
    const signalRes = await fetch(`${MOCK_API}/market-signal`, {
      headers: { 'x-payment-proof': paymentProof.proof },
      signal: AbortSignal.timeout(4000),
    });

    if (signalRes.ok) {
      const signal = await signalRes.json();
      console.log(chalk.green.bold(
        `\n  📊 Signal received: ${signal.signal} ${signal.asset} @ ${(signal.confidence * 100).toFixed(0)}% confidence`
      ));
      console.log(chalk.green(`  Price target: $${signal.price_target}  |  Timeframe: ${signal.timeframe}`));
    } else {
      const err = await signalRes.json();
      console.log(chalk.yellow(`\n  ℹ️  API responded: ${err.error} (start mock-api/server.js to get live data)`));
      console.log(chalk.green.bold('  📊 Signal received: BUY SOL @ 87% confidence  [demo value]'));
    }
  } catch {
    console.log(chalk.yellow('\n  ℹ️  Mock API not running — start it with: node mock-api/server.js'));
    console.log(chalk.green.bold('  📊 Signal received: BUY SOL @ 87% confidence  [demo value]'));
  }
  await sleep(600);

  // ── 6. Rotate stealth session ─────────────────────────────────────────────
  step(6, '🔄 Rotating stealth session...');
  await sleep(400);
  await agent.rotateStealthSession();
  await sleep(400);

  // ── 7. Final comparison table ─────────────────────────────────────────────
  console.log(chalk.gray('\n' + '─'.repeat(60)));
  printComparisonTable();

  console.log(chalk.white.bold('\n  Veil shields AI agent payments at the protocol level.'));
  console.log(chalk.gray('  MagicBlock PER — Intel TDX TEE-backed private state\n'));
  console.log(chalk.gray('  Colosseum Frontier Hackathon — Privacy Track'));
  console.log(chalk.gray('  github.com/your-org/veil\n'));
}

main().catch((err) => {
  console.error(chalk.red(`\n❌ Fatal error: ${err.message}`));
  process.exit(1);
});
