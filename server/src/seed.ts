// import { PrismaClient, UserRole, AppointmentStatus, BookingStatus, PaymentMethod, PaymentStatus, NotificationType } from "@prisma/client";

// const prisma = new PrismaClient();

// async function main() {
//   // --- USERS ---
//   const admin = await prisma.user.create({
//     data: {
//       email: "admin@platform.com",
//       phone: "0711000000",
//       password: "hashedpassword",
//       firstName: "Admin",
//       lastName: "User",
//       role: "ADMIN",
//     },
//   });

//   const salonOwner1 = await prisma.user.create({
//     data: {
//       email: "owner1@salon.com",
//       phone: "0711000001",
//       password: "hashedpassword",
//       firstName: "Alice",
//       lastName: "Styles",
//       role: "SALON_OWNER",
//     },
//   });

//   const client1 = await prisma.user.create({
//     data: {
//       email: "client1@test.com",
//       phone: "0711000002",
//       password: "hashedpassword",
//       firstName: "John",
//       lastName: "Doe",
//       role: "CLIENT",
//     },
//   });

//   await prisma.clientProfile.create({
//     data: { userId: client1.id, gender: "Male", totalBookings: 2 },
//   });

//   await prisma.salonOwnerProfile.create({
//     data: { userId: salonOwner1.id, businessName: "Alice Glam Studio" },
//   });

//   // --- SALONS ---
//   const salon1 = await prisma.salon.create({
//     data: {
//       name: "Alice Glam Studio",
//       phone: "0711000003",
//       address: "123 Beauty St",
//       city: "Nairobi",
//       location: "CBD",
//       businessHours: { mon: "9-6", tue: "9-6" },
//       ownerId: salonOwner1.id,
//     },
//   });

//   // --- SERVICES ---
//   const haircut = await prisma.service.create({
//     data: { name: "Haircut", description: "Basic cut", category: "Hair" },
//   });
//   const manicure = await prisma.service.create({
//     data: { name: "Manicure", description: "Nail trim & polish", category: "Nails" },
//   });

//   await prisma.salonService.createMany({
//     data: [
//       { salonId: salon1.id, serviceId: haircut.id, price: 500, duration: 45 },
//       { salonId: salon1.id, serviceId: manicure.id, price: 700, duration: 60 },
//     ],
//   });

//   // --- SLOTS ---
//   const slot1 = await prisma.slot.create({
//     data: {
//       date: new Date(),
//       startTime: new Date(),
//       endTime: new Date(new Date().getTime() + 60 * 60000),
//       salonId: salon1.id,
//       serviceId: haircut.id,
//     },
//   });

//   // --- APPOINTMENTS & BOOKINGS ---
//   const appointment = await prisma.appointment.create({
//     data: {
//       date: new Date(),
//       startTime: new Date(),
//       endTime: new Date(new Date().getTime() + 60 * 60000),
//       status: "CONFIRMED",
//       salonId: salon1.id,
//       serviceId: haircut.id,
//       slotId: slot1.id,
//     },
//   });

//   const booking = await prisma.booking.create({
//     data: {
//       bookingNumber: "BKG001",
//       totalAmount: 500,
//       status: "CONFIRMED",
//       clientId: client1.id,
//       salonId: salon1.id,
//       serviceId: haircut.id,
//       appointmentId: appointment.id,
//       slotId: slot1.id,
//     },
//   });

//   // --- PAYMENT ---
//   await prisma.payment.create({
//     data: {
//       amount: 500,
//       method: "MPESA",
//       status: "COMPLETED",
//       bookingId: booking.id,
//       mpesaReceiptNumber: "MP123456",
//     },
//   });

//   // --- REVIEW ---
//   await prisma.review.create({
//     data: {
//       rating: 4.5,
//       comment: "Loved the haircut!",
//       clientId: client1.id,
//       salonId: salon1.id,
//       bookingId: booking.id,
//     },
//   });

//   // --- WAITLIST ---
//   await prisma.waitlistEntry.create({
//     data: {
//       date: new Date(),
//       timeSlot: "afternoon",
//       clientId: client1.id,
//       salonId: salon1.id,
//     },
//   });

//   // --- REMINDERS ---
//   await prisma.reminder.create({
//     data: {
//       type: "24h_before",
//       scheduledFor: new Date(),
//       message: "Reminder: Your appointment is tomorrow!",
//       channel: "sms",
//       bookingId: booking.id,
//     },
//   });

//   // --- NOTIFICATIONS ---
//   await prisma.notification.create({
//     data: {
//       type: "BOOKING_CONFIRMATION",
//       title: "Booking Confirmed",
//       message: "Your booking has been confirmed.",
//       userId: client1.id,
//     },
//   });

//   // --- STATS ---
//   await prisma.salonStatistic.create({
//     data: {
//       salonId: salon1.id,
//       date: new Date(),
//       totalBookings: 1,
//       completedBookings: 1,
//       totalRevenue: 500,
//       averageBookingValue: 500,
//     },
//   });

//   await prisma.platformStatistic.create({
//     data: {
//       date: new Date(),
//       totalUsers: 3,
//       totalSalons: 1,
//       totalBookings: 1,
//       totalRevenue: 500,
//       platformCommission: 50,
//     },
//   });

//   console.log("✅ Seed data inserted successfully!");
// }

// main()
//   .then(async () => await prisma.$disconnect())
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
