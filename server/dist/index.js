"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.connectClient = connectClient;
// server/src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = __importDefault(require("pg"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const salonRoutes_1 = __importDefault(require("./routes/salonRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const appointmentRoutes_1 = __importDefault(require("./routes/appointmentRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const reminderRoutes_1 = __importDefault(require("./routes/reminderRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const statisticRoutes_1 = __importDefault(require("./routes/statisticRoutes"));
const slotRoutes_1 = __importDefault(require("./routes/slotRoutes"));
const waitlistRoutes_1 = __importDefault(require("./routes/waitlistRoutes"));
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
const salonServiceRoutes_1 = __importDefault(require("./routes/salonServiceRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const http_1 = __importDefault(require("http"));
const socket_1 = require("./realtime/socket");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
require("./cron/slotScheduler");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const server = http_1.default.createServer(app);
(0, socket_1.initSocket)(server);
const reminder_1 = require("./cron/reminder");
// Start reminder cron
(0, reminder_1.startReminderCron)();
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "https://fahari.vercel.app"],
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
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/uploads', express_1.default.static('uploads'));
const { Pool } = pg_1.default;
exports.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // turn off SSL for local dev
});
// ✅ Database Connection Check
async function connectClient() {
    try {
        const client = await exports.pool.connect();
        console.log("✅ Connected to the database.");
        client.release();
    }
    catch (err) {
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
app.use('/api/salons', salonRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/appointments', appointmentRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/reminders', reminderRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/statistics', statisticRoutes_1.default);
app.use('/api/slots', slotRoutes_1.default);
app.use('/api/waitlist', waitlistRoutes_1.default);
app.use('/api/search', searchRoutes_1.default);
app.use('/api/salon-services', salonServiceRoutes_1.default);
app.use('/api/services', serviceRoutes_1.default);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.get('/', (_, res) => res.send('Fahari AI Backend is Live 🚀'));
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
