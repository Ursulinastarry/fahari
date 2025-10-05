// src/services/notificationService.ts
import { pool } from "../index";
import { io } from "../realtime/socket";
import axios from "axios";

export type NotifyPayload = {
  userId?: string;       // single user
  role?: "ADMIN" | "SALON_OWNER" | "CLIENT"; // or everyone with a role
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
  sendEmail?: boolean; // Optional: control whether to send email
  emailTo?: string;    // Optional: override email recipient
};

// Cache the account ID to avoid fetching it every time
let cachedAccountId: string | undefined = undefined;

async function getZohoAccountId(): Promise<string> {
  if (cachedAccountId !== undefined) {
    return cachedAccountId;
  }

  try {
    const response = await axios.get(
      "https://mail.zoho.com/api/accounts",
      {
        headers: {
          "Authorization": `Zoho-oauthtoken ${process.env.ZOHO_API_TOKEN}`,
          "Accept": "application/json",
        },
      }
    );

    // The API returns an array of accounts, get the first one
    if (response.data?.data && response.data.data.length > 0) {
      const accountId = String(response.data.data[0].accountId);
      cachedAccountId = accountId;
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
          "Authorization": `Zoho-oauthtoken ${process.env.ZOHO_API_TOKEN}`,
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