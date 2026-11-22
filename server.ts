import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

function loadFirebaseWebApiKey(): string {
  try {
    const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as { apiKey?: string };
      return parsed.apiKey || '';
    }
  } catch {
    // Fallback to environment variable if config file is absent
  }
  return process.env.VITE_FIREBASE_API_KEY || '';
}

async function verifyFirebaseIdToken(
  idToken: string,
  firebaseApiKey: string
): Promise<VerifiedFirebaseUser | null> {
  if (!idToken || !firebaseApiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        disabled?: boolean;
      }>;
    };
    const u = data.users?.[0];
    if (!u || !u.localId || u.disabled) return null;
    return {
      uid: u.localId,
      email: u.email || '',
      emailVerified: Boolean(u.emailVerified),
    };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const firebaseApiKey = loadFirebaseWebApiKey();

  // Simple sliding-window rate limiter per authenticated UID for WhatsApp relay
  const whatsappRateBuckets = new Map<string, number[]>();
  const RATE_WINDOW_MS = 60_000;
  const RATE_MAX_REQUESTS = 5;

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
    next();
  });

  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'finzo-exotic-world' });
  });

  app.get('/api/integrations/status', (_req, res) => {
    const whatsappConfigured = Boolean(
      process.env.WHATSAPP_CLOUD_API_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID &&
        process.env.WHATSAPP_OWNER_NUMBER
    );
    const mapsConfigured = Boolean(
      process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
    );
    res.json({
      whatsappConfigured,
      mapsConfigured,
    });
  });

  app.post('/api/whatsapp/notify-order', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerToken) {
      res.status(401).json({
        sent: false,
        configured: false,
        error: 'Authentication required to dispatch order notifications.',
      });
      return;
    }

    const verifiedUser = await verifyFirebaseIdToken(bearerToken, firebaseApiKey);
    if (!verifiedUser) {
      res.status(401).json({
        sent: false,
        configured: false,
        error: 'Invalid or expired authentication session.',
      });
      return;
    }
    if (!verifiedUser.emailVerified) {
      res.status(403).json({
        sent: false,
        configured: false,
        error: 'Verified account email required to dispatch order notifications.',
      });
      return;
    }

    const now = Date.now();
    const recent = (whatsappRateBuckets.get(verifiedUser.uid) ?? []).filter(
      (ts) => now - ts < RATE_WINDOW_MS
    );
    if (recent.length >= RATE_MAX_REQUESTS) {
      res.status(429).json({
        sent: false,
        configured: true,
        error: 'Too many order notification requests. Please wait a minute before retrying.',
      });
      return;
    }
    recent.push(now);
    whatsappRateBuckets.set(verifiedUser.uid, recent);

    const { message, recipientNumber } = req.body as {
      message?: string;
      recipientNumber?: string;
    };

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length < 10 ||
      message.length > 4096
    ) {
      res.status(400).json({
        sent: false,
        configured: false,
        error: 'Valid order message (10–4096 characters) is required.',
      });
      return;
    }

    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const ownerNumber = (process.env.WHATSAPP_OWNER_NUMBER || '').replace(/[^0-9]/g, '');

    if (!token || !phoneNumberId || !ownerNumber) {
      res.json({
        sent: false,
        configured: false,
        message: 'WhatsApp Cloud API credentials are not configured; use the prefilled WhatsApp link.',
      });
      return;
    }

    // Never relay to arbitrary third-party numbers supplied by the client
    if (recipientNumber && typeof recipientNumber === 'string') {
      const requestedDigits = recipientNumber.replace(/[^0-9]/g, '');
      if (requestedDigits && requestedDigits !== ownerNumber) {
        res.status(403).json({
          sent: false,
          configured: true,
          error: 'Notifications may only be dispatched to the verified store WhatsApp number.',
        });
        return;
      }
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: ownerNumber,
            type: 'text',
            text: {
              preview_url: false,
              body: message.trim().slice(0, 4096),
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(`WhatsApp Cloud API returned HTTP ${response.status}`);
        res.status(502).json({
          sent: false,
          configured: true,
          error: `WhatsApp Cloud API returned status ${response.status}.`,
        });
        return;
      }

      const data = (await response.json()) as { messages?: Array<{ id?: string }> };
      res.json({
        sent: true,
        configured: true,
        messageId: data.messages?.[0]?.id ?? null,
      });
    } catch (err) {
      console.error('WhatsApp Cloud API request error:', err instanceof Error ? err.message : 'Unknown error');
      res.status(500).json({
        sent: false,
        configured: true,
        error: 'Unable to contact WhatsApp Cloud API.',
      });
    }
  });

  // Ensure unknown /api/* endpoints return JSON 404 rather than falling through to SPA HTML
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`FINZO EXOTIC WORLD server listening on port ${port}`);
  });
}

void startServer();
