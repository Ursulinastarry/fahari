// server/src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
import userRoutes from './routes/userRoutes.js';
import salonRoutes from './routes/salonRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import statisticRoutes from './routes/statisticRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import salonServiceRoutes from './routes/salonServiceRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/auth.js';
import pushRoutes from './routes/pushRoutes.js';
import http from "http";
import { initSocket } from "./realtime/socket.js";
import cookieParser from 'cookie-parser';
import "./cron/slotScheduler.js";
import "./cron/reminder.js";
import path from 'path';
import { fileURLToPath } from 'url';
console.log("server running");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const allowedOrigins = [
    "https://faharibeauty.com",
    "http://localhost:5173",
    "http://localhost:3000"
];
// console.log("hitting cors")
app.use(cors({
    origin: function (origin, callback) {
        // console.log('CORS Origin:', origin); // Debug log
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            // console.log('Origin not allowed:', origin); // Debug log
            const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
            return callback(new Error(msg), false);
        }
        // console.log('Origin allowed:', origin); // Debug log
        return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
}));
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
initSocket(server);
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
const { Pool } = pkg;
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // turn off SSL for local dev
});
// ✅ Database Connection Check
export async function connectClient() {
    try {
        const client = await pool.connect();
        console.log("✅ Connected to the database.");
        client.release();
    }
    catch (err) {
        console.error("❌ Error connecting to the database:", err);
    }
}
connectClient();
console.log("hitting routes");
// Routes
app.use('/api/salons', salonRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/statistics', statisticRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/salon-services', salonServiceRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/ai-chat', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/push', pushRoutes);
// Serve static files from uploads directory (after all routes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/', (_, res) => res.send('Fahari AI Backend is Live 🚀'));
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
