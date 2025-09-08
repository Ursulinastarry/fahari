"use strict";
// import prisma from '../config/prisma';
// export const isSlotAvailable = async (
//   providerId: string,
//   startTime: Date,
//   endTime: Date
// ): Promise<boolean> => {
//   const conflictingBookings = await prisma.booking.findMany({
//     where: {
//       providerId,
//       OR: [
//         {
//           startTime: {
//             lt: endTime,
//           },
//           endTime: {
//             gt: startTime,
//           },
//         },
//       ],
//       status: {
//         notIn: ['cancelled'],
//       },
//     },
//   });
//   return conflictingBookings.length === 0;
// };
// export const getAvailableTimeBlocks = (
//   dayStart: Date,
//   dayEnd: Date,
//   durationMs: number,
//   bookings: { startTime: Date, endTime: Date }[]
// ) => {
//   const slots: string[] = [];
//   let current = new Date(dayStart);
//   while (current.getTime() + durationMs <= dayEnd.getTime()) {
//     const next = new Date(current.getTime() + durationMs);
//     const hasConflict = bookings.some(b =>
//       (current < b.endTime && next > b.startTime)
//     );
//     if (!hasConflict) {
//       slots.push(current.toISOString());
//     }
//     current = new Date(current.getTime() + 15 * 60 * 1000); // 15 min steps
//   }
//   return slots;
// };
