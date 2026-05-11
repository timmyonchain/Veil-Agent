// Simulates a paid data API that requires x402-style payment proofs.
// In production this would verify on-chain payment; here we check header presence.
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.MOCK_API_PORT || 3001;

// Timestamp every request and log whether a payment proof was present
function logRequest(req, hasProof) {
  const ts = new Date().toISOString();
  const status = hasProof ? '✅ PAID' : '⛔ NO PROOF';
  console.log(`[${ts}] ${req.method} ${req.path} — ${status}`);
}

// Middleware: reject requests missing a payment proof header with HTTP 402
function requirePaymentProof(req, res, next) {
  const proof = req.headers['x-payment-proof'];
  if (!proof || proof.trim() === '') {
    logRequest(req, false);
    return res.status(402).json({
      error: 'Payment required',
      amount: '0.01 USDC',
      hint: 'Include x-payment-proof header with a valid Veil payment proof',
    });
  }
  logRequest(req, true);
  next();
}

// Market signal endpoint — premium data requiring a payment proof
app.get('/market-signal', requirePaymentProof, (req, res) => {
  res.json({
    signal: 'BUY',
    asset: 'SOL',
    confidence: 0.87,
    price_target: 168.40,
    timeframe: '4h',
    timestamp: Date.now(),
  });
});

// Price feed endpoint — same payment gate
app.get('/price-feed', requirePaymentProof, (req, res) => {
  res.json({
    SOL: 142.50,
    BTC: 94200,
    ETH: 3210,
    timestamp: Date.now(),
  });
});

// Health check — free, no proof needed
app.get('/health', (req, res) => {
  res.json({ status: 'ok', api: 'Veil Mock Data API v1.0' });
});

app.listen(PORT, () => {
  console.log(`\n🌐 Mock Data API running on http://localhost:${PORT}`);
  console.log('   Endpoints: GET /market-signal  GET /price-feed');
  console.log('   Requires: x-payment-proof header\n');
});
