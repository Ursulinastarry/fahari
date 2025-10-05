// src/services/notificationService.ts
import { pool } from "../index";
import { io } from "../realtime/socket";
import axios from "axios";

/**
 * SETUP INSTRUCTIONS FOR ZOHO OAUTH:
 * 
 * 1. Go to https://accounts.zoho.com/developerconsole
 * 2. Click "GET STARTED" and choose "Self Client"
 * 3. Enter a Client Name (e.g., "Fahari Beauty Notifications")
 * 4. Click CREATE - you'll get Client ID and Client Secret
 * 
 * 5. Generate the initial token by visiting this URL in your browser:
 *    https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.messages.ALL,ZohoMail.accounts.READ&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost
 * 
 * 6. After authorization, you'll be redirected to localhost with a code parameter
 *    Copy the code from the URL
 * 
 * 7. Exchange the code for tokens using this curl command (or Postman):
 *    curl -X POST "https://accounts.zoho.com/oauth/v2/token?code=YOUR_CODE&grant_type=authorization_code&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=http://localhost"
 * 
 * 8. Add to your .env file:
 *    ZOHO_CLIENT_ID=your_client_id
 *    ZOHO_CLIENT_SECRET=your_client_secret
 *    ZOHO_REFRESH_TOKEN=your_refresh_token (from step 7)
 *    ZOHO_EMAIL=your_zoho_email_address
 */

export type NotifyPayload = {
  userId?: string;
  role?: "ADMIN" | "SALON_OWNER" | "CLIENT";
  title: string;
  message: string;
  type?:
    | "BOOKING_CONFIRMATION"
    | "BOOKING_UPDATE"
    | "BOOKING_REMINDER"
    | "BOOKING_CANCELLATION"
    | "PAYMENT_SUCCESS"
    | "PAYMENT_FAILED"
    | "GENERAL";
  data?: Record<string, any>;
  sendEmail?: boolean;
  emailTo?: string;
};

// Cache tokens and account ID
let cachedAccessToken: string | undefined = undefined;
let tokenExpiry: number = 0;
let cachedAccountId: string | undefined = undefined;

async function refreshAccessToken(): Promise<string> {
  try {
    const response = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      null,
      {
        params: {
          refresh_token: process.env.ZOHO_REFRESH_TOKEN,
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          grant_type: "refresh_token",
        },
      }
    );

    const accessToken = String(response.data.access_token);
    const expiresIn = Number(response.data.expires_in);
    
    cachedAccessToken = accessToken;
    // Set expiry to 5 minutes before actual expiry (default is 1 hour)
    tokenExpiry = Date.now() + (expiresIn - 300) * 1000;
    
    console.log("Access token refreshed successfully");
    return accessToken;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    if (axios.isAxiosError(error)) {
      console.error("Response data:", error.response?.data);
    }
    throw new Error("Failed to refresh Zoho access token");
  }
}

async function getAccessToken(): Promise<string> {
  // If token exists and hasn't expired, return it
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  // Otherwise refresh the token
  return await refreshAccessToken();
}

async function getZohoAccountId(): Promise<string> {
  if (cachedAccountId !== undefined) {
    return cachedAccountId;
  }

  try {
    const accessToken = await getAccessToken();
    
    const response = await axios.get(
      "https://mail.zoho.com/api/accounts",
      {
        headers: {
          "Authorization": `Zoho-oauthtoken ${accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (response.data?.data && response.data.data.length > 0) {
      const accountId = String(response.data.data[0].accountId);
      cachedAccountId = accountId;
      console.log("Zoho account ID cached:", accountId);
      return accountId;
    }

    throw new Error("No Zoho Mail account found");
  } catch (error) {
    console.error("Error fetching Zoho account ID:", error);
    if (axios.isAxiosError(error)) {
      console.error("Response data:", error.response?.data);
      console.error("Response status:", error.response?.status);
    }
    throw error;
  }
}

async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    const accessToken = await getAccessToken();
    const accountId = await getZohoAccountId();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${title}</h2>
        <p style="color: #666; line-height: 1.6;">${message}</p>
        ${data ? `
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333;">Additional Details:</h3>
            <pre style="background-color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
          </div>
        ` : ''}
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Fahari Beauty.
        </p>
      </div>
    `;

    const emailPayload = {
      fromAddress: process.env.ZOHO_EMAIL,
      toAddress: to,
      subject: title,
      content: htmlContent,
      mailFormat: "html",
    };

    const response = await axios.post(
      `https://mail.zoho.com/api/accounts/${accountId}/messages`,
      emailPayload,
      {
        headers: {
          "Authorization": `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      }
    );

    console.log(`Email sent to ${to}`, response.data);
  } catch (error) {
    console.error("Error sending email:", error);
    if (axios.isAxiosError(error)) {
      console.error("Response data:", error.response?.data);
      console.error("Response status:", error.response?.status);
      console.error("Request URL:", error.config?.url);
    }
    // Don't throw - we don't want email failures to break notifications
  }
}

export async function createAndSendNotification(payload: NotifyPayload) {
  const {
    userId,
    role,
    title,
    message,
    type = "GENERAL",
    data,
    sendEmail = false,
    emailTo,
  } = payload;

  // 🔹 Role-based notification (broadcast to multiple users)
  if (role) {
    const { rows: users } = await pool.query(
      `SELECT id, email FROM users WHERE role = $1`,
      [role]
    );

    for (const user of users) {
      const { rows } = await pool.query(
        `INSERT INTO notifications ("userId", type, title, message, data, "isRead")
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [
          user.id,
          type,
          title,
          message,
          data ? JSON.stringify(data) : null,
        ]
      );

      const notif = rows[0];
      io.to(`user:${user.id}`).emit("notification:new", notif);
    }

    // 🔹 Send email if requested (for role notifications)
    if (sendEmail && emailTo) {
      await sendNotificationEmail(emailTo, title, message, data);
    }

    return;
  }

  // 🔹 Single-user notification
  if (userId) {
    const { rows } = await pool.query(
      `INSERT INTO notifications ("userId", type, title, message, data, "isRead")
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [
        userId,
        type,
        title,
        message,
        data ? JSON.stringify(data) : null,
      ]
    );

    const notif = rows[0];
    io.to(`user:${userId}`).emit("notification:new", notif);

    // 🔹 Send email if requested
    if (sendEmail && emailTo) {
      await sendNotificationEmail(emailTo, title, message, data);
    }

    return notif;
  }

  throw new Error("Notification must have either userId or role");
}

// Export for direct use if needed
export { sendNotificationEmail };