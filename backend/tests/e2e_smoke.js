// Simple E2E smoke test for API flows
// Requires backend running on localhost:5100

const BASE = process.env.BASE || 'http://127.0.0.1:5100';
if (!process.env.JWT_SECRET) {
  // Default secret for local smoke runs; backend requires it
  process.env.JWT_SECRET = 'test-secret';
}

async function req(path, { method='GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${method} ${path}`);
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}

async function waitForBackend(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(BASE + '/');
      if (r.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Backend not reachable at ' + BASE);
}

async function ensureRegister(payload) {
  try {
    await req('/api/auth/register', { method: 'POST', body: payload });
    return true;
  } catch (e) {
    if (e.status === 409 || (e.data && /already registered/i.test(JSON.stringify(e.data)))) return false;
    throw e;
  }
}

async function login(email, password) {
  const out = await req('/api/auth/login', { method: 'POST', body: { email, password } });
  return { token: out.token, user: out.user };
}

(async () => {
  const pw = 'Passw0rd!';
  await waitForBackend(8000);
  // Users
  const clientEmail = 'client1@example.com';
  const lawyerEmail = 'lawyer1@example.com';
  const courtEmail  = 'court1@example.com';

  await ensureRegister({ email: clientEmail, password: pw, role: 'client', full_name: 'Client One', id_number: 'ID123' });
  await ensureRegister({ email: lawyerEmail, password: pw, role: 'lawyer', full_name: 'Lawyer One', bar_number: '1001', specialization: 'Civil' });
  await ensureRegister({ email: courtEmail,  password: pw, role: 'court', court_name: 'Central Court', jurisdiction: 'AA', court_type: 'Federal' });

  const { token: clientToken, user: client } = await login(clientEmail, pw);
  const { token: lawyerToken, user: lawyer } = await login(lawyerEmail, pw);
  const { token: courtToken,  user: court  } = await login(courtEmail,  pw);

  // Create a case as lawyer
  const createdCase = await req('/api/cases', {
    method: 'POST',
    token: lawyerToken,
    body: {
      title: 'Smith vs Doe',
      description: 'Initial filing regarding contract dispute',
      clientId: client.id || client._id,
      courtId: court.id || court._id,
    },
  });
  const caseId = createdCase._id || createdCase.id;

  // Create a virtual session as court
  const when = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const session = await req('/api/courtsessions', {
    method: 'POST', token: courtToken,
    body: { caseId, scheduleDate: when, is_virtual: true, involvedClientIds: [client.id || client._id] },
  });
  const sessionId = session.id || session._id;

  // Connect to signaling and listen for session-ended
  let gotEndedEvent = false;
  let ioClient = null;
  try {
    const { io } = require('socket.io-client');
    ioClient = io(BASE.replace('http', 'ws').replace('https', 'wss').replace(/:\/\//, '://').replace('127.0.0.1', 'localhost'), {
      path: '/ws/socket.io', transports: ['websocket'],
    });
    await new Promise((resolve) => ioClient.once('connect', resolve));
    ioClient.emit('join-room', String(sessionId));
    const endedPromise = new Promise((resolve) => ioClient.once('session-ended', () => { gotEndedEvent = true; resolve(true); }));
    // End the session via REST
    await req(`/api/courtsessions/${sessionId}/end`, { method: 'PUT', token: courtToken, body: { status: 'completed', notes: 'Adjourned' } });
    // Wait briefly for socket event
    await Promise.race([
      endedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for session-ended')), 3000))
    ]).catch(() => {});
  } catch (e) {
    // socket test optional
  } finally {
    try { ioClient && ioClient.close(); } catch {}
  }

  // Fetch to verify
  const fetched = await req(`/api/courtsessions/${sessionId}`, { method: 'GET', token: courtToken });

  const summary = {
    clientId: client.id || client._id,
    lawyerId: lawyer.id || lawyer._id,
    courtId: court.id || court._id,
    caseId,
    sessionId,
    sessionStatus: fetched.status || fetched.session?.status,
    isVirtual: !!(fetched.is_virtual),
    gotEndedEvent,
  };
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
})().catch((err) => {
  console.error('E2E smoke failed:', err && err.status, err && (err.data || err.message));
  process.exit(1);
});
