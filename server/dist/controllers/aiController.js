import { getMyBookingsService, getBookingsData, getSalonsService, getSlotsService, getAllServicesService } from '../services/aiService.js';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const handleAIChat = async (req, res) => {
    try {
        const { messages, userRole, userId } = req.body;
        // Verify user is authenticated (adjust based on your auth middleware)
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Fetch live data based on user role
        const liveData = await fetchLiveDataForUser(userRole, userId);
        // Build role-specific system prompt
        const systemPrompt = buildSystemPrompt(userRole, liveData);
        // Call Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 800
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
// Fetch relevant data based on user role
async function fetchLiveDataForUser(userRole, userId) {
    const baseUrl = 'https://fahari-production.up.railway.app/api';
    try {
        if (userRole === 'CLIENT') {
            const [salonsResult, servicesResult, slotsResult, bookingsResult] = await Promise.all([
                // getSalonsService expects a query object
                getSalonsService({ page: 1, limit: 10 }),
                // getAllServicesService takes no params
                getAllServicesService(),
                // getSlotsService expects a query (can be empty)
                getSlotsService({}),
                // getMyBookingsService expects userId
                getMyBookingsService(userId),
            ]);
            return {
                salons: salonsResult.salons, // includes pagination inside
                salonServices: servicesResult,
                slots: slotsResult,
                bookings: bookingsResult,
            };
        }
        else if (userRole === 'SALON_OWNER') {
            // Fetch data relevant to salon owners
            const [bookings] = await Promise.all([
                fetch(`${baseUrl}/bookings/owner`).then(r => r.json()),
                // fetch(`${baseUrl}/slots/salons?salonId=${salonId}`).then(r => r.json()),
                // fetch(`${baseUrl}/revenue?salonId=${userId}`).then(r => r.json()),
                // fetch(`${baseUrl}/salon-services?salonId=${salonId}`).then(r => r.json())
            ]);
            return { bookings };
        }
        else if (userRole === 'ADMIN') {
            // Fetch platform-wide data for admin
            const [salons, users,] = await Promise.all([
                fetch(`${baseUrl}/salons`).then(r => r.json()),
                fetch(`${baseUrl}/users`).then(r => r.json()),
                // fetch(`${baseUrl}/platform-revenue`).then(r => r.json())
            ]);
            const bookings = await getBookingsData(userId, userRole);
            return { salons, users, bookings };
        }
        return null;
    }
    catch (error) {
        console.error('Error fetching live data:', error);
        return null;
    }
}
// Build role-specific system prompts
function buildSystemPrompt(userRole, liveData) {
    if (userRole === 'CLIENT') {
        return `You are a helpful assistant for Fahari Salon Management System.
You are helping a CLIENT user who wants to book bookings and find salon services.

AVAILABLE SALONS:
${liveData?.salons?.map(s => -`${s.name} at ${s.location || 'location not specified'}`).join('\n') || 'No salons available'}

AVAILABLE SERVICES:
${liveData?.salonServices?.map(s => -`${s.service.name}: KSh ${s.price}, Duration: ${s.duration} minutes`).join('\n') || 'No services available'}

AVAILABLE SLOTS:
${liveData?.slots?.filter(s => s.isAvailable).map(s => -`${s.startTime} at ${s.endTime} (${s.salon.name || 'Salon'})`).join('\n') || 'No slots available'}

USER'S BOOKINGS:
${liveData?.bookings?.map(a => `- at ${a.slotStartTime} with ${a.salonName} (Status: ${a.status})`).join('\n') || 'No bookings yet'}

Help the client:
- Find available salons and services
- Book bookings at available time slots
- Check their existing bookings
- Answer questions about services and pricing
Be friendly, concise, and helpful.`;
    }
    else if (userRole === 'SALON_OWNER') {
        return `You are a helpful assistant for Fahari Salon Management System.
You are helping a SALON_OWNER manage their salon business.

UPCOMING bookings:
${liveData?.bookings?.slice(0, 10).map(a => `- ${a.firstName} ${a.lastName} at ${a.slotStartTime} for ${a.serviceName} (${a.status})`).join('\n') || 'No bookings'}

AVAILABLE SLOTS:
${liveData?.slots?.filter(s => s.isAvailable).length || 0} slots available

// REVENUE SUMMARY:
// - Total Revenue: KSh ${liveData?.revenue?.total || 0}
// - This Month: KSh ${liveData?.revenue?.this_month || 0}
// - Pending Payments: KSh ${liveData?.revenue?.pending || 0}

SERVICES OFFERED:
${liveData?.salonServices?.map(s => `- ${s.service.name}: KSh ${s.price}`).join('\n') || 'No services'}

Help the salon owner:
- Manage bookings and bookings
- Track revenue and earnings
- Manage available time slots
- Answer questions about their business performance
Be professional and data-focused.`;
    }
    else if (userRole === 'ADMIN') {
        return `You are a helpful assistant for Fahari Salon Management System.
You are helping an ADMIN with platform management and analytics.

PLATFORM STATISTICS:
- Total Salons: ${liveData?.salons?.length || 0}
- Total Users: ${liveData?.users?.length || 0}
- Total bookings: ${liveData?.bookings?.length || 0}
// - Platform Revenue: KSh ${liveData?.revenue?.total || 0}

TOP SALONS:
${liveData?.salons?.slice(0, 5).map(s => `- ${s.name}:  Rating: ${s.averageRating || 'N/A'}`).join('\n') || 'No salon data'}

RECENT ACTIVITY:
${liveData?.bookings?.slice(0, 5).map(a => `- ${a.firstName} ${a.lastName} booked ${a.salonName} on ${a.slotStartTime}`).join('\n') || 'No recent activity'}

Help the admin:
- Monitor platform performance
- Analyze salon and user data
- Track revenue and bookings across the platform
- Answer any system-wide questions
Be analytical and comprehensive.`;
    }
    return 'You are a helpful assistant for Fahari Salon Management System.';
}
