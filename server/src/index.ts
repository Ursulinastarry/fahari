// server/src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import userRoutes from './routes/userRoutes';
import salonRoutes from './routes/salonRoutes';
import notificationRoutes from './routes/notificationRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import bookingRoutes from './routes/bookingRoutes';
import paymentRoutes from './routes/paymentRoutes';
import reminderRoutes from './routes/reminderRoutes';
import reviewRoutes from './routes/reviewRoutes';
import statisticRoutes from './routes/statisticRoutes';
import slotRoutes from './routes/slotRoutes';
import waitlistRoutes from './routes/waitlistRoutes';
import searchRoutes from './routes/searchRoutes';
import salonServiceRoutes from './routes/salonServiceRoutes';
import serviceRoutes from './routes/serviceRoutes';
import http,{Server} from "http";
import { initSocket } from "./realtime/socket";
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import "./cron/slotScheduler";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
initSocket(server);
import { startReminderCron } from "./cron/reminder";


// Start reminder cron
startReminderCron();

app.use(cors({
  origin: ["http://localhost:5173","https://fahari.vercel.app","https://faharibeauty.com"],
  methods: "GET, POST, PUT, PATCH, DELETE",
  credentials: true // allows cookies and auth headers
}));

// app.use(
//   fileUpload({
//     createParentPath: true,
//     limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB
//     abortOnLimit: true,
//   })
// );

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // turn off SSL for local dev
});

// ✅ Database Connection Check
export async function connectClient(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to the database.");
    client.release();
  } catch (err) {
    console.error("❌ Error connecting to the database:", err);
  }
}
connectClient();

// ✅ GLOBAL LOGGER MIDDLEWARE
// app.use((req, res, next) => {
//   const start = Date.now();
//   res.on("finish", () => {
//     const duration = Date.now() - start;
//     console.log(
//       `📌 ${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`
//     );
//   });
//   next();
// });

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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (_, res) => res.send('Fahari AI Backend is Live 🚀'));

server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
