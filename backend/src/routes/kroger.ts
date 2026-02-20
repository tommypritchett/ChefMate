import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  getKrogerAuthUrl,
  exchangeKrogerAuthCode,
  refreshKrogerUserToken,
  addToKrogerCart,
} from '../services/grocery-prices';

const router = express.Router();

// GET /api/kroger/status — Check if user has linked their Kroger account
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { krogerAccessToken: true, krogerTokenExpiresAt: true },
    });

    const isLinked = !!user?.krogerAccessToken;
    const isExpired = user?.krogerTokenExpiresAt ? new Date(user.krogerTokenExpiresAt) < new Date() : true;

    res.json({ isLinked, isExpired: isLinked ? isExpired : null });
  } catch (error) {
    console.error('Kroger status error:', error);
    res.status(500).json({ error: 'Failed to check Kroger status' });
  }
});

// GET /api/kroger/auth-url — Returns Kroger OAuth authorization URL with user state
router.get('/auth-url', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // Encode userId in state so the callback can identify which user authorized
    const state = Buffer.from(JSON.stringify({ userId: req.user!.userId })).toString('base64url');
    const url = getKrogerAuthUrl(state);
    if (!url) {
      return res.status(503).json({ error: 'Kroger API not configured' });
    }
    res.json({ url });
  } catch (error) {
    console.error('Kroger auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// GET /api/kroger/callback — OAuth redirect handler (browser redirect from Kroger)
// Kroger redirects here with ?code=...&state=...
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;
    const error = req.query.error as string;

    if (error) {
      return res.send(callbackHTML('Authorization Denied', 'You declined the Kroger authorization. You can close this window.', false));
    }

    if (!code || !stateParam) {
      return res.status(400).send(callbackHTML('Error', 'Missing authorization code or state.', false));
    }

    // Decode state to get userId
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
      userId = decoded.userId;
      if (!userId) throw new Error('No userId');
    } catch {
      return res.status(400).send(callbackHTML('Error', 'Invalid state parameter.', false));
    }

    // Exchange code for tokens
    const tokens = await exchangeKrogerAuthCode(code);
    if (!tokens) {
      return res.status(400).send(callbackHTML('Error', 'Failed to exchange authorization code. Please try again.', false));
    }

    // Store tokens on user
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        krogerAccessToken: tokens.accessToken,
        krogerRefreshToken: tokens.refreshToken,
        krogerTokenExpiresAt: expiresAt,
      },
    });

    res.send(callbackHTML('Account Linked!', 'Your Kroger account has been linked. You can now add items to your cart from ChefMate. Close this window to continue.', true));
  } catch (error) {
    console.error('Kroger callback error:', error);
    res.status(500).send(callbackHTML('Error', 'Something went wrong. Please try again.', false));
  }
});

// POST /api/kroger/add-to-cart — Add items to user's Kroger cart
router.post('/add-to-cart', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required (each with upc and quantity)' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { krogerAccessToken: true, krogerRefreshToken: true, krogerTokenExpiresAt: true },
    });

    if (!user?.krogerAccessToken) {
      return res.status(401).json({ error: 'Kroger account not linked. Please link your account first.' });
    }

    // Refresh token if expired
    let accessToken = user.krogerAccessToken;
    if (user.krogerTokenExpiresAt && new Date(user.krogerTokenExpiresAt) < new Date()) {
      if (!user.krogerRefreshToken) {
        return res.status(401).json({ error: 'Kroger session expired. Please re-link your account.' });
      }
      const refreshed = await refreshKrogerUserToken(user.krogerRefreshToken);
      if (!refreshed) {
        return res.status(401).json({ error: 'Failed to refresh Kroger session. Please re-link your account.' });
      }
      accessToken = refreshed.accessToken;
      const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          krogerAccessToken: refreshed.accessToken,
          krogerRefreshToken: refreshed.refreshToken,
          krogerTokenExpiresAt: expiresAt,
        },
      });
    }

    const success = await addToKrogerCart(accessToken, items);
    if (!success) {
      return res.status(500).json({ error: 'Failed to add items to Kroger cart' });
    }

    res.json({ success: true, message: `Added ${items.length} item(s) to your Kroger cart` });
  } catch (error) {
    console.error('Kroger add to cart error:', error);
    res.status(500).json({ error: 'Failed to add items to cart' });
  }
});

// Simple HTML response for the OAuth callback page
function callbackHTML(title: string, message: string, success: boolean): string {
  const color = success ? '#10b981' : '#ef4444';
  const icon = success ? '&#10003;' : '&#10007;';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - ChefMate</title>
<style>
  body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
  .card{text-align:center;padding:2rem;max-width:360px}
  .icon{font-size:48px;color:${color};margin-bottom:1rem}
  h1{color:#1f2937;font-size:1.25rem;margin:0 0 0.5rem}
  p{color:#6b7280;font-size:0.875rem;line-height:1.5}
</style></head>
<body><div class="card">
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  <p>${message}</p>
</div></body></html>`;
}

export default router;
