"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlotsForDay = generateSlotsForDay;
const prisma_1 = __importDefault(require("../config/prisma"));
const luxon_1 = require("luxon");
async function generateSlotsForDay(salonId, date, openHour, closeHour) {
    const slots = [];
    const day = luxon_1.DateTime.fromJSDate(date).setZone("Africa/Nairobi").startOf("day");
    for (let hour = openHour; hour < closeHour; hour++) {
        const start = day.plus({ hours: hour }).toJSDate();
        const end = day.plus({ hours: hour + 1 }).toJSDate();
        slots.push({
            salonId,
            date: start, // you can store start of day here if needed
            startTime: start,
            endTime: end,
            isAvailable: true,
        });
    }
    await prisma_1.default.slot.createMany({
        data: slots,
        skipDuplicates: true,
    });
    console.log(`✅ Slots generated for salon ${salonId} on ${day.toISODate()}`);
}
