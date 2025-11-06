import axios from 'axios';
import { DateTime } from 'luxon';
export class MpesaService {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.environment === 'sandbox'
            ? 'https://sandbox.safaricom.co.ke'
            : 'https://api.safaricom.co.ke';
    }
    // Get OAuth token
    async getAccessToken() {
        const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
        const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    }
    // Generate password for STK push
    generatePassword() {
        const timestamp = DateTime.now().setZone('Africa/Nairobi').toFormat('yyyyMMddHHmmss');
        const password = Buffer.from(`${this.config.shortcode}${this.config.passkey}${timestamp}`).toString('base64');
        return { password, timestamp };
    }
    // Initiate STK Push
    async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
        const token = await this.getAccessToken();
        const { password, timestamp } = this.generatePassword();
        // Format phone number (remove + and ensure it starts with 254)
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        }
        else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
            formattedPhone = '254' + formattedPhone;
        }
        const payload = {
            BusinessShortCode: this.config.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.ceil(amount), // M-Pesa requires whole numbers
            PartyA: formattedPhone,
            PartyB: this.config.shortcode,
            PhoneNumber: formattedPhone,
            CallBackURL: this.config.callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc
        };
        const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    // Query STK Push status
    async querySTKPushStatus(checkoutRequestId) {
        const token = await this.getAccessToken();
        const { password, timestamp } = this.generatePassword();
        const payload = {
            BusinessShortCode: this.config.shortcode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };
        const response = await axios.post(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
}
// Initialize M-Pesa service
export const mpesaService = new MpesaService({
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    shortcode: process.env.MPESA_SHORTCODE || '',
    passkey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/payments/callback',
    environment: 'sandbox'
});
