// A stand-in for the Paystack API (https://api.paystack.co) for the e2e tests, so they can run the whole payment flow
// without real keys or network access. Playwright starts it on port 5055 and points the API at it (playwright.config.ts).
// It implements just what the API uses: initialize, verify, and a checkout page with "Pay" and "Cancel" buttons.
import { createServer } from 'node:http';

const PORT = 5055;
const SECRET_KEY = 'sk_test_fake_for_e2e'; // keep in sync with FAKE_PAYSTACK_SECRET in tests/helpers.ts
const transactions = new Map(); // reference → { reference, amount, currency, callbackUrl, status }

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function returnToShop(res, tx) {
  const url = new URL(tx.callbackUrl);
  url.searchParams.set('trxref', tx.reference);
  url.searchParams.set('reference', tx.reference);
  redirect(res, url.toString());
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || '{}');
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const authorized = req.headers.authorization === `Bearer ${SECRET_KEY}`;
  let match;

  if (pathname === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/transaction/initialize') {
    if (!authorized) return sendJson(res, 401, { status: false, message: 'Invalid key' });
    const { reference, amount, currency, callback_url: callbackUrl, email } = await readJson(req);
    if (!reference || !amount || !email || !callbackUrl) {
      return sendJson(res, 400, { status: false, message: 'Missing reference, amount, email or callback_url' });
    }
    if (transactions.has(reference)) return sendJson(res, 400, { status: false, message: 'Duplicate Transaction Reference' });
    transactions.set(reference, { reference, amount, currency, callbackUrl, status: 'abandoned' });
    return sendJson(res, 200, {
      status: true,
      message: 'Authorization URL created',
      data: { authorization_url: `http://localhost:${PORT}/checkout/${reference}`, access_code: 'fake', reference }
    });
  }

  if (req.method === 'GET' && (match = pathname.match(/^\/transaction\/verify\/(.+)$/))) {
    if (!authorized) return sendJson(res, 401, { status: false, message: 'Invalid key' });
    const tx = transactions.get(decodeURIComponent(match[1]));
    if (!tx) return sendJson(res, 400, { status: false, message: 'Transaction reference not found' });
    const { reference, status, amount, currency } = tx;
    return sendJson(res, 200, { status: true, message: 'Verification successful', data: { reference, status, amount, currency } });
  }

  // The customer-facing checkout page.
  if (req.method === 'GET' && (match = pathname.match(/^\/checkout\/([^/]+)(\/pay|\/cancel)?$/))) {
    const tx = transactions.get(match[1]);
    if (!tx) return sendJson(res, 404, { status: false, message: 'Not found' });
    if (match[2] === '/pay') {
      tx.status = 'success';
      return returnToShop(res, tx);
    }
    if (match[2] === '/cancel') return returnToShop(res, tx);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`<!doctype html><title>Fake Paystack</title>
      <h1>Fake Paystack</h1><p>Amount: ${tx.amount} ${tx.currency}</p>
      <a href="/checkout/${tx.reference}/pay">Pay</a> <a href="/checkout/${tx.reference}/cancel">Cancel</a>`);
  }

  sendJson(res, 404, { status: false, message: 'Not found' });
}).listen(PORT, () => console.log(`Fake Paystack listening on http://localhost:${PORT}`));
