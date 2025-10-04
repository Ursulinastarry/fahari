// src/services/notificationService.ts
import { pool } from "../index";
import { io } from "../realtime/socket";
import nodemailer from "nodemailer";

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

// Create Zoho transporter
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
});

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    await resend.emails.send({
      from: "Fahari Beauty <onboarding@resend.dev>",
      to: to,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${message}</p>
        </div>
      `,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
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