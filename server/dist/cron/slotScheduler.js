"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerSlotGeneration = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../config/prisma"));
const slotGenerator_1 = require("../utils/slotGenerator");
/**
 * Cron job to delete expired slots (where end time is less than now)
 * Runs every minute (Africa/Nairobi).
 */
// cron.schedule(
//   "* * * * *", // every minute
//   async () => {
//     const now = DateTime.now().setZone("Africa/Nairobi");
//     console.log("🗑️ Running expired slot cleanup...");
//     console.log("⏰ Current Nairobi time:", now.toISO());
//     try {
//       const deleted = await prisma.slot.deleteMany({
//         where: {
//           endTime: {
//             lt: now.toJSDate(), // Prisma expects JS Date
//           },
//         },
//       });
//       console.log(
//         `🧹 Deleted ${deleted.count} expired slots at ${now.toFormat("yyyy-LL-dd HH:mm")}`
//       );
//     } catch (err) {
//       console.error("❌ Failed to delete expired slots:", err);
//     }
//   },
//   { timezone: "Africa/Nairobi" }
// );
// PRODUCTION CRON - Runs at 10am
node_cron_1.default.schedule("0 10 * * *", // 10am daily
async () => {
    console.log("🕛 Running daily slot generator for day +7...");
    console.log("⏰ Current time:", new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    try {
        const salons = await prisma_1.default.salon.findMany();
        console.log(`📍 Found ${salons.length} salons`);
        if (salons.length === 0) {
            console.log("⚠️ No salons found in database");
            return;
        }
        const today = new Date();
        const targetDay = new Date(today.getTime());
        targetDay.setDate(today.getDate() + 7);
        console.log(`🎯 Generating slots for ${targetDay.toDateString()}`);
        for (const salon of salons) {
            try {
                const weekday = targetDay.getDay(); // 0=Sunday, 1=Monday...
                let openHour = 9, closeHour = 17;
                const businessHours = salon.businessHours;
                console.log(`🏪 Processing ${salon.name}, business hours:`, businessHours);
                if (businessHours.weekdays && businessHours.weekends) {
                    // --- Format 1: compact ---
                    if (weekday >= 1 && weekday <= 5) {
                        [openHour, closeHour] = businessHours.weekdays
                            .split("-")
                            .map((h, idx) => idx === 1 && Number(h) < 12 ? Number(h) + 12 : Number(h));
                    }
                    else {
                        [openHour, closeHour] = businessHours.weekends
                            .split("-")
                            .map((h, idx) => idx === 1 && Number(h) < 12 ? Number(h) + 12 : Number(h));
                    }
                }
                else {
                    // --- Format 2: per-day ---
                    const dayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                    const todayKey = dayMap[weekday];
                    const dayConfig = businessHours[todayKey];
                    if (!dayConfig || dayConfig.closed) {
                        console.log(`🚫 ${salon.name} is closed on ${targetDay.toDateString()}`);
                        continue;
                    }
                    openHour = Number(dayConfig.open.split(":")[0]);
                    closeHour = Number(dayConfig.close.split(":")[0]);
                }
                if (openHour >= closeHour) {
                    console.log(`🚫 ${salon.name} is closed on ${targetDay.toDateString()}`);
                    continue;
                }
                console.log(`⏰ ${salon.name} hours: ${openHour}:00 - ${closeHour}:00`);
                await (0, slotGenerator_1.generateSlotsForDay)(salon.id, targetDay, openHour, closeHour);
                console.log(`✅ Slots generated for ${salon.name} on ${targetDay.toDateString()}`);
            }
            catch (err) {
                console.error(`❌ Failed to generate slots for ${salon.name}:`, err);
            }
        }
        console.log(`🎉 Completed slot generation for ${targetDay.toDateString()}`);
    }
    catch (err) {
        console.error("❌ Failed to fetch salons:", err);
    }
}, { timezone: "Africa/Nairobi" });
// Manual trigger function for testing
const triggerSlotGeneration = async () => {
    console.log("🔧 Manually triggering slot generation...");
    // Copy the same logic from the midnight cron here
};
exports.triggerSlotGeneration = triggerSlotGeneration;
console.log("📅 Daily slot generator cron job scheduled for midnight (Africa/Nairobi)");
console.log("⏰ Current time:", new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
