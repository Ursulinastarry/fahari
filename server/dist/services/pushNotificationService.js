// src/services/pushNotificationService.ts
import webpush from 'web-push';
import { pool } from '../index.js';
// Configure VAPID keys
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
};
webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, vapidKeys.publicKey, vapidKeys.privateKey);
/**
 * Store user push subscription in database
 */
export async function savePushSubscription(userId, subscription) {
    try {
        await pool.query(`INSERT INTO push_subscriptions ("userId", endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("userId", endpoint)
       DO UPDATE SET p256dh = $3, auth = $4, "updatedAt" = NOW()`, [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
    }
    catch (error) {
        console.error('Error saving push subscription:', error);
        throw error;
    }
}
/**
 * Get all push subscriptions for a user
 */
export async function getPushSubscriptions(userId) {
    try {
        const result = await pool.query(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE "userId" = $1`, [userId]);
        return result.rows.map(row => ({
            endpoint: row.endpoint,
            keys: {
                p256dh: row.p256dh,
                auth: row.auth,
            },
        }));
    }
    catch (error) {
        console.error('Error getting push subscriptions:', error);
        return [];
    }
}
/**
 * Remove a push subscription
 */
export async function removePushSubscription(userId, endpoint) {
    try {
        await pool.query(`DELETE FROM push_subscriptions WHERE "userId" = $1 AND endpoint = $2`, [userId, endpoint]);
    }
    catch (error) {
        console.error('Error removing push subscription:', error);
        throw error;
    }
}
/**
 * Send push notification to a user
 */
export async function sendPushNotification(userId, payload) {
    try {
        const subscriptions = await getPushSubscriptions(userId);
        if (subscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`);
            return;
        }
        const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/logo.png',
            badge: payload.badge || '/favicon.png',
            data: payload.data,
            actions: payload.actions,
        });
        const results = await Promise.allSettled(subscriptions.map(subscription => webpush.sendNotification(subscription, notificationPayload)));
        // Remove invalid subscriptions
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const subscription = subscriptions[index];
                console.error(`Failed to send push to ${subscription.endpoint}:`, result.reason);
                // If subscription is invalid (410 Gone), remove it
                if (result.reason?.statusCode === 410) {
                    removePushSubscription(userId, subscription.endpoint).catch(console.error);
                }
            }
        });
        console.log(`Sent push notification to ${userId}: ${results.filter(r => r.status === 'fulfilled').length}/${subscriptions.length} successful`);
    }
    catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}
/**
 * Send push notification to all users with a specific role
 */
export async function sendPushNotificationToRole(role, payload) {
    try {
        // Get all users with the specified role who have push subscriptions
        const result = await pool.query(`SELECT DISTINCT u.id as userId
       FROM users u
       JOIN push_subscriptions ps ON u.id = ps."userId"
       WHERE u.role = $1`, [role]);
        const userIds = result.rows.map(row => row.userid);
        console.log(`Sending push notification to ${userIds.length} users with role ${role}`);
        await Promise.allSettled(userIds.map(userId => sendPushNotification(userId, payload)));
    }
    catch (error) {
        console.error('Error sending push notification to role:', error);
        throw error;
    }
}
