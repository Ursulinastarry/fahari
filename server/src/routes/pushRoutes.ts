// src/routes/pushRoutes.ts
import express from 'express';
import { protect } from '../middlewares/protect';
import { savePushSubscription, removePushSubscription } from '../services/pushNotificationService';
import { UserRequest } from '../utils/types/userTypes';
import { sendPushNotification } from '../services/pushNotificationService';
const router = express.Router();

// Save push subscription
router.post('/subscribe', protect, async (req: UserRequest, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user!.id;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Invalid subscription data' });
    }

    await savePushSubscription(userId, subscription);
    res.json({ message: 'Push subscription saved successfully' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ message: 'Failed to save push subscription' });
  }
});

// Remove push subscription
router.post('/unsubscribe', protect, async (req: UserRequest, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user!.id;

    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required' });
    }

    await removePushSubscription(userId, endpoint);
    res.json({ message: 'Push subscription removed successfully' });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ message: 'Failed to remove push subscription' });
  }
});

// Get VAPID public key (needed for client-side subscription)
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ message: 'VAPID public key not configured' });
  }
  res.json({ publicKey });
});

// Test endpoint to send a push notification to the current user
router.post('/test', protect, async (req: UserRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title = 'Test Notification', message = 'This is a test push notification' } = req.body;

    await sendPushNotification(userId, {
      title,
      body: message,
      data: { test: true, timestamp: new Date().toISOString() }
    });

    res.json({ message: 'Test push notification sent' });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    res.status(500).json({ message: 'Failed to send test notification' });
  }
});

export default router;