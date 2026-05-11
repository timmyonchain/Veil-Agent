// Attacker perspective: monitors a Solana wallet for transactions in real time.
// Shows what an on-chain observer CAN and CANNOT learn about an agent's behavior.
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const KEYPAIR_PATH = './agent-keypair.json';
const RPC_URL = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';

// Load the agent's keypair to extract the public key to monitor
function loadAgentPubkey() {
  if (!fs.existsSync(KEYPAIR_PATH)) {
    console.log(chalk.red('No agent keypair found at ./agent-keypair.json'));
    console.log(chalk.yellow('Run "node agent/index.js" first to generate the agent wallet.\n'));
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  return keypair.publicKey;
}

// Decode what an attacker could infer from a log entry (public payment)
function analyzePublicPayment(logs) {
  const isTokenTransfer = logs.some((l) => l.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'));
  const isTransfer = logs.some((l) => l.includes('Transfer'));
  return { isTokenTransfer, isTransfer };
}

// Determine if the transaction shows PER activity (Veil-shielded)
function isPERTransaction(logs) {
  return logs.some(
    (l) =>
      l.toLowerCase().includes('magicblock') ||
      l.toLowerCase().includes('ephemeral') ||
      l.toLowerCase().includes('per')
  );
}

async function main() {
  const agentPubkey = loadAgentPubkey();
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log(chalk.red.bold('\n╔══════════════════════════════════════════════════╗'));
  console.log(chalk.red.bold('║      CHAIN SURVEILLANCE TERMINAL — ATTACKER      ║'));
  console.log(chalk.red.bold('╚══════════════════════════════════════════════════╝\n'));

  console.log(chalk.red(`👁️  ATTACKER: Monitoring agent wallet`));
  console.log(chalk.red(`   ${agentPubkey.toBase58()}\n`));
  console.log(chalk.red('⚡ Subscribed to Solana devnet transaction logs...'));
  console.log(chalk.gray('   (In a second terminal, run: node agent/index.js)\n'));
  console.log(chalk.gray('─'.repeat(52)));

  let txCount = 0;

  // Subscribe to real-time logs for the monitored wallet
  connection.onLogs(
    agentPubkey,
    (logInfo) => {
      txCount++;
      const ts = new Date().toISOString().split('T')[1].slice(0, 8);
      const sig = logInfo.signature.slice(0, 16) + '...';

      console.log(chalk.yellow(`\n[${ts}] TX #${txCount} detected — sig: ${sig}`));

      if (logInfo.err) {
        console.log(chalk.gray('  Status: failed — no useful intel'));
        return;
      }

      const logs = logInfo.logs || [];

      if (isPERTransaction(logs)) {
        // Veil-shielded payment — attacker can see something happened but not what
        console.log(chalk.green('  👁️  ATTACKER: Transaction detected... [ENCRYPTED]'));
        console.log(chalk.green('  ┌────────────────────────────────────────────────┐'));
        console.log(chalk.green('  │ Recipient: ████████████████ (shielded in PER)  │'));
        console.log(chalk.green('  │ Amount:    ████████████████ (shielded in PER)  │'));
        console.log(chalk.green('  │ Program:   MagicBlock PER rollup               │'));
        console.log(chalk.green('  │ Intel:     ❌ Cannot determine payment details  │'));
        console.log(chalk.green('  └────────────────────────────────────────────────┘'));
        console.log(chalk.green('  ✅ Veil protected this payment — intel: ZERO'));
      } else {
        const { isTokenTransfer } = analyzePublicPayment(logs);

        if (isTokenTransfer) {
          // Public SPL token transfer — attacker extracts full intel
          console.log(chalk.red('  👁️  ATTACKER: PUBLIC SPL TOKEN TRANSFER DETECTED'));
          console.log(chalk.red('  ┌────────────────────────────────────────────────┐'));
          console.log(chalk.red(`  │ Sender:    ${agentPubkey.toBase58().slice(0, 20)}...        │`));
          console.log(chalk.red('  │ Recipient: [extracted from token accounts]      │'));
          console.log(chalk.red('  │ Amount:    [extracted from transfer instruction] │'));
          console.log(chalk.red('  │ Program:   SPL Token — full data visible        │'));
          console.log(chalk.red('  │ Intel:     ✅ Full payment details EXPOSED      │'));
          console.log(chalk.red('  └────────────────────────────────────────────────┘'));
          console.log(chalk.red('  ⚠️  Competitor intel extracted — strategy at risk'));
        } else {
          // Some other transaction type
          console.log(chalk.gray('  👁️  ATTACKER: Transaction type — non-payment'));
          console.log(chalk.gray(`  Logs (${logs.length} entries): ${logs[0] || 'none'}`));
        }
      }

      // Track cumulative exposure risk
      console.log(chalk.gray(`\n  Cumulative transactions monitored: ${txCount}`));
      if (txCount >= 3) {
        console.log(chalk.red('  ⚠️  Pattern analysis: agent activity frequency identified'));
      }
    },
    'confirmed'
  );

  // Demonstrate the attacker's view without live transactions (for offline demo use)
  console.log(chalk.gray('\n[SIMULATION — shows what attacker sees without waiting for live txns]\n'));

  await new Promise((r) => setTimeout(r, 1500));
  console.log(chalk.red('  👁️  [Simulated public payment detected at 00:01]'));
  console.log(chalk.red('  ┌────────────────────────────────────────────────┐'));
  console.log(chalk.red(`  │ Sender:    ${agentPubkey.toBase58().slice(0, 20)}...        │`));
  console.log(chalk.red('  │ Recipient: MarketDataApiWa11et11111111111111111 │'));
  console.log(chalk.red('  │ Amount:    0.01 USDC                            │'));
  console.log(chalk.red('  │ Intel:     ✅ Agent buys market signals!        │'));
  console.log(chalk.red('  └────────────────────────────────────────────────┘'));

  await new Promise((r) => setTimeout(r, 2000));
  console.log(chalk.green('\n  👁️  [Simulated Veil-shielded payment detected at 00:03]'));
  console.log(chalk.green('  ┌────────────────────────────────────────────────┐'));
  console.log(chalk.green('  │ Recipient: ████████████████ (shielded in PER)  │'));
  console.log(chalk.green('  │ Amount:    ████████████████ (shielded in PER)  │'));
  console.log(chalk.green('  │ Intel:     ❌ Cannot determine payment details  │'));
  console.log(chalk.green('  └────────────────────────────────────────────────┘'));
  console.log(chalk.green('  ✅ Veil protected this payment — intel: ZERO'));

  console.log(chalk.gray('\n─'.repeat(52)));
  console.log(chalk.gray('Listening for live transactions... (Ctrl+C to stop)\n'));

  // Keep process alive for real-time monitoring
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(chalk.red(`\n❌ Surveillance monitor error: ${err.message}`));
  process.exit(1);
});
