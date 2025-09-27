import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL } = process.env;
const baseUrl = 'https://sandbox.safaricom.co.ke';
const getAccessToken = async () => {
    const res = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        auth: {
            username: MPESA_CONSUMER_KEY,
            password: MPESA_CONSUMER_SECRET
        }
    });
    return res.data.access_token;
};
export const sendSTKPush = async (phone, amount, payToSalonTill, salonTill) => {
    const token = await getAccessToken();
    const partyB = payToSalonTill ? salonTill : process.env.MPESA_SHORTCODE;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    const res = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
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
