// src/routes/contactRoutes.ts
import { Router } from "express";
import { sendNotificationEmail } from "../services/notificationService";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Send email to help@faharibeauty.com
    await sendNotificationEmail(
      "help@faharibeauty.com",
      `Contact Form: ${subject}`,
      `
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        
        Message:
        ${message}
      `,
      { name, email, subject }
    );

    res.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;