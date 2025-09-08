"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSTKPush = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL } = process.env;
const baseUrl = 'https://sandbox.safaricom.co.ke';
const getAccessToken = async () => {
    const res = await axios_1.default.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        auth: {
            username: MPESA_CONSUMER_KEY,
            password: MPESA_CONSUMER_SECRET
        }
    });
    return res.data.access_token;
};
const sendSTKPush = async (phone, amount, payToSalonTill, salonTill) => {
    const token = await getAccessToken();
    const partyB = payToSalonTill ? salonTill : process.env.MPESA_SHORTCODE;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    const res = await axios_1.default.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: partyB,
        PhoneNumber: phone,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: "FahariAI",
        TransactionDesc: "Salon Booking Payment"
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};
exports.sendSTKPush = sendSTKPush;
