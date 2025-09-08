"use strict";
// import { Request, Response } from 'express';
// import { sendSTKPush } from '../services/mpesaService';
// import { generateConfirmationMessage } from '../services/aiService';
// import prisma from '../config/prisma';
// export const initiateSTKPush = async (req: Request, res: Response) => {
//   const { phone, amount } = req.body;
//   try {
//     const response = await sendSTKPush(phone, amount, false);
//     res.status(200).json(response);
//   } catch (err) {
//     console.error('STK Error:', err);
//     res.status(500).json({ message: 'M-Pesa STK Push failed' });
//   }
// };
// export const handleCallback = async (req: Request, res: Response) => {
//   const callback = req.body.Body?.stkCallback;
//   const resultCode = callback?.ResultCode;
//   console.log("📲 M-Pesa Callback Received:", JSON.stringify(callback, null, 2));
//   if (resultCode === 0) {
//     const metadata = callback.CallbackMetadata;
//     const receipt = metadata?.Item?.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
//     const phone = metadata?.Item?.find((i: any) => i.Name === 'PhoneNumber')?.Value;
//     const amount = metadata?.Item?.find((i: any) => i.Name === 'Amount')?.Value;
//     console.log("✅ Payment Success:", { phone, amount, receipt });
//     try {
//       // Find the most recent pending booking for this phone
//       const booking = await prisma.booking.findFirst({
//         where: {
//           user: { phone: phone },
//           status: 'pending'
//         },
//         orderBy: {
//           createdAt: 'desc'
//         },
//         include: {
//           user: true,
//           service: true,
//           provider: true
//         }
//       });
//       if (booking) {
//         await prisma.booking.update({
//           where: { id: booking.id },
//           data: {
//             status: 'paid',
//             paymentRef: receipt
//           }
//         });
//         const message = await generateConfirmationMessage(booking);
//         console.log('🤖 AI Confirmation:', message);
//         // You can send this message via SMS or email later
//       } else {
//         console.warn("⚠️ No matching booking found for phone:", phone);
//       }
//     } catch (err) {
//       console.error("❌ Error updating booking:", err);
//     }
//   } else {
//     console.warn("❌ Payment failed or cancelled");
//   }
//   res.status(200).json({ message: 'Callback received' });
// };
