"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerSlotGeneration = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../config/prisma"));
const slotGenerator_1 = require("../utils/slotGenerator");
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
                const weekday = targetDay.getDay();
                let openHour = 9, closeHour = 17;
                const businessHours = salon.businessHours;
                console.log(`🏪 Processing ${salon.name}, business hours:`, businessHours);
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
