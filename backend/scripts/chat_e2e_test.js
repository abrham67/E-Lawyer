/*
 End-to-end chat verification:
 - Ensures two users exist
 - Connects a Socket.IO client for the recipient
 - Sends a message via REST from sender to recipient
 - Verifies real-time receipt (chat:message) and REST listing
*/

const { io } = require('socket.io-client');

const BASE = process.env.BASE_URL || 'http://localhost:5100';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function ensureUser({ email, password, role, full_name }) {
  // Try register; if exists, ignore
  try {
    await api('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, full_name })
    });
  } catch (e) {
    // 409 means exists; ignore others for now
  }
  const { token, user } = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return { token, user };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  try {
    const ts = Date.now();
    const senderCreds = { email: `sender${ts}@test.local`, password: 'Passw0rd!', role: 'client', full_name: 'Sender Test' };
    const recipientCreds = { email: `recipient${ts}@test.local`, password: 'Passw0rd!', role: 'lawyer', full_name: 'Recipient Test' };

    const { token: senderToken, user: sender } = await ensureUser(senderCreds);
    const { token: recipientToken, user: recipient } = await ensureUser(recipientCreds);

    const expectedText = `Hello at ${new Date(ts).toISOString()}`;

    // Connect Socket.IO as recipient (join personal room)
    const sock = io(BASE, {
      path: '/ws/socket.io',
      transports: ['websocket'],
      query: { userId: recipient._id || recipient.id },
    });

    let realtimeReceived = null;
    const gotMessage = new Promise((resolve) => {
      sock.on('connect', () => {
        // connected
      });
      sock.on('chat:message', (msg) => {
        if (msg && msg.text === expectedText) {
          realtimeReceived = msg;
          resolve(msg);
        }
      });
    });

    // Give socket a moment to connect
    await sleep(300);

    // Send via REST from sender
    const created = await api('/api/communication/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${senderToken}` },
      body: JSON.stringify({ recipientId: recipient._id || recipient.id, message: expectedText })
    });

    // Wait up to 3s for realtime
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for realtime message')), 3000));
    await Promise.race([gotMessage, timeout]);

    // Verify list API for sender
    const list = await api('/api/communication/messages', {
      headers: { Authorization: `Bearer ${senderToken}` }
    });
    const found = Array.isArray(list.messages) && list.messages.some(m => m.text === expectedText && String(m.recipientId) === String(recipient._id || recipient.id));

    if (realtimeReceived && found) {
      console.log('E2E chat PASS');
      console.log({ createdId: created._id || created.id, realtimeId: realtimeReceived._id || realtimeReceived.id });
      process.exit(0);
    } else {
      console.error('E2E chat FAIL: conditions not met', { realtimeReceived: !!realtimeReceived, found });
      process.exit(1);
    }
  } catch (e) {
    console.error('E2E chat ERROR:', e.message);
    process.exit(1);
  }
})();
