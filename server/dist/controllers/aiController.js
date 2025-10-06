import { getBookingsData } from '../services/aiService.js';
import { getMyBookingsService } from '../services/aiService.js';
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
            // Fetch data relevant to clients
            // const [salons, services, slots, appointments] = await Promise.all([
            //   fetch(`${baseUrl}/salons`).then(r => r.json()),
            //   fetch(`${baseUrl}/salon-services`).then(r => r.json()),
            //   fetch(`${baseUrl}/slots`).then(r => r.json()),
            //   fetch(`${baseUrl}/bookings/me`).then(r => r.json())
            // ]);
            const bookings = await getMyBookingsService(userId);
            return { bookings };
        }
        else if (userRole === 'SALON_OWNER') {
            // Fetch data relevant to salon owners
            const [appointments] = await Promise.all([
                fetch(`${baseUrl}/bookings/owner`).then(r => r.json()),
                // fetch(`${baseUrl}/slots/salons?salonId=${salonId}`).then(r => r.json()),
                // fetch(`${baseUrl}/revenue?salonId=${userId}`).then(r => r.json()),
                // fetch(`${baseUrl}/salon-services?salonId=${salonId}`).then(r => r.json())
            ]);
            return { appointments };
        }
        else if (userRole === 'ADMIN') {
            // Fetch platform-wide data for admin
            const [salons, users, appointments] = await Promise.all([
                fetch(`${baseUrl}/salons`).then(r => r.json()),
                fetch(`${baseUrl}/users`).then(r => r.json()),
                fetch(`${baseUrl}/bookings`).then(r => r.json()),
                // fetch(`${baseUrl}/platform-revenue`).then(r => r.json())
            ]);
            const bookings = await getBookingsData(userId, userRole);
            return { salons, users, appointments, bookings };
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
You are helping a CLIENT user who wants to book appointments and find salon services.



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

UPCOMING APPOINTMENTS:
${liveData?.appointments?.slice(0, 10).map(a => `- ${a.firstName} ${a.lastName} at ${a.slotStartTime} for ${a.serviceName} (${a.status})`).join('\n') || 'No appointments'}

AVAILABLE SLOTS:
${liveData?.slots?.filter(s => s.isAvailable).length || 0} slots available

// REVENUE SUMMARY:
// - Total Revenue: KSh ${liveData?.revenue?.total || 0}
// - This Month: KSh ${liveData?.revenue?.this_month || 0}
// - Pending Payments: KSh ${liveData?.revenue?.pending || 0}

SERVICES OFFERED:
${liveData?.services?.map(s => `- ${s.name}: KSh ${s.price}`).join('\n') || 'No services'}

Help the salon owner:
- Manage appointments and bookings
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
- Total Appointments: ${liveData?.appointments?.length || 0}
// - Platform Revenue: KSh ${liveData?.revenue?.total || 0}

TOP SALONS:
${liveData?.salons?.slice(0, 5).map(s => `- ${s.name}: ${s.total_bookings || 0} bookings, Rating: ${s.rating || 'N/A'}`).join('\n') || 'No salon data'}

RECENT ACTIVITY:
${liveData?.appointments?.slice(0, 5).map(a => `- ${a.firstName} ${a.lastName} booked ${a.salonName} on ${a.slotStartTime}`).join('\n') || 'No recent activity'}

Help the admin:
- Monitor platform performance
- Analyze salon and user data
- Track revenue and bookings across the platform
- Answer any system-wide questions
Be analytical and comprehensive.`;
    }
    return 'You are a helpful assistant for Fahari Salon Management System.';
}
