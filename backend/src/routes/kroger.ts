import express from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  getKrogerAuthUrl,
  exchangeKrogerAuthCode,
  refreshKrogerUserToken,
  addToKrogerCart,
} from '../services/grocery-prices';

const router = express.Router();

// Helper functions for secure state parameter handling
function signState(data: any): string {
  const stateSecret = process.env.STATE_SECRET || process.env.JWT_SECRET || 'default-secret';

  // Add timestamp for expiry validation (5 minutes)
  const stateData = {
    ...data,
    exp: Date.now() + 5 * 60 * 1000, // 5 minutes from now
  };

  const payload = JSON.stringify(stateData);
  const signature = crypto
    .createHmac('sha256', stateSecret)
    .update(payload)
    .digest('hex');

  // Combine payload and signature, separated by a dot
  const signedState = `${Buffer.from(payload).toString('base64url')}.${signature}`;
  return signedState;
}

function verifyState(signedState: string): any | null {
  try {
    const stateSecret = process.env.STATE_SECRET || process.env.JWT_SECRET || 'default-secret';

    const [payloadB64, signature] = signedState.split('.');
    if (!payloadB64 || !signature) {
      return null;
    }

    const payload = Buffer.from(payloadB64, 'base64url').toString();

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', stateSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('State signature verification failed');
      return null;
    }

    const data = JSON.parse(payload);

    // Check expiry
    if (!data.exp || data.exp < Date.now()) {
      console.error('State parameter has expired');
      return null;
    }

    return data;
  } catch (error) {
    console.error('State verification error:', error);
    return null;
  }
}

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
    // Sign userId in state so the callback can securely identify which user authorized
    const state = signState({ userId: req.user!.userId });
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

    // Verify and decode state to get userId
    const stateData = verifyState(stateParam);
    if (!stateData || !stateData.userId) {
      console.error('Invalid or tampered state parameter');
      return res.status(400).send(callbackHTML('Error', 'Invalid or expired state parameter. Please try again.', false));
    }

    const userId = stateData.userId;

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
    const { items, listId, itemIds } = req.body;
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

    // Mark shopping list items as added to cart with quantity tracking
    if (listId && Array.isArray(itemIds) && itemIds.length > 0) {
      // itemQuantities maps itemId → quantity sent to cart (passed from frontend)
      const itemQuantities: Record<string, number> = req.body.itemQuantities || {};

      for (const itemId of itemIds) {
        // Accumulate: add to existing krogerCartQuantity
        const existing = await prisma.shoppingListItem.findUnique({
          where: { id: itemId },
          select: { krogerCartQuantity: true, krogerProductId: true, quantity: true },
        });
        if (!existing) continue;
        const prevQty = existing.krogerCartQuantity || 0;
        // Get added qty: explicit from frontend > matched cart item > DB item quantity
        let addedQty = itemQuantities[itemId];
        if (!addedQty && existing.krogerProductId) {
          const matched = items.find((ci: any) => ci.upc === existing.krogerProductId);
          addedQty = matched?.quantity;
        }
        if (!addedQty) addedQty = existing.quantity || 1;

        await prisma.shoppingListItem.update({
          where: { id: itemId },
          data: {
            addedToKrogerCartAt: new Date(),
            krogerCartQuantity: prevQty + addedQty,
          },
        });
      }
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
