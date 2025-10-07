import { getMyBookingsService, getSalonsService, getSlotsService, getAllServicesService, getOwnerBookingsService, getOwnerServicesService, getOwnerSlotsService, getOwnerSalonsService, getAllUsersService, getAllBookingsService, getAllSalonsService, } from '../services/aiService.js';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const handleAIChat = async (req, res) => {
    try {
        const { messages, userRole, userId } = req.body;
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
                Authorization: `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                temperature: 0.7,
                max_tokens: 800,
            }),
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
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
// Fetch relevant data based on user role
async function fetchLiveDataForUser(userRole, userId) {
    try {
        if (userRole === 'CLIENT') {
            const [salonsResult, servicesResult, slotsResult, bookingsResult] = await Promise.all([
                getSalonsService({ page: 1, limit: 10 }),
                getAllServicesService(),
                getSlotsService({}),
                getMyBookingsService(userId),
            ]);
            const salons = salonsResult?.salons || [];
            const salonServices = servicesResult || [];
            const slots = slotsResult || [];
            const bookings = bookingsResult || [];
            return { salons, salonServices, slots, bookings };
        }
        else if (userRole === 'SALON_OWNER') {
            const [ownerBookings, ownerServices, ownerSlots, ownerSalons] = await Promise.all([
                getOwnerBookingsService(userId),
                getOwnerServicesService(userId),
                getOwnerSlotsService(userId),
                getOwnerSalonsService(userId),
            ]);
            return {
                ownerBookings: ownerBookings || [],
                ownerServices: ownerServices || [],
                ownerSlots: ownerSlots || [],
                ownerSalons: ownerSalons || [],
            };
        }
        else if (userRole === 'ADMIN') {
            const [allSalons, allUsers, allBookings] = await Promise.all([
                getAllSalonsService(),
                getAllUsersService(),
                getAllBookingsService(),
            ]);
            return {
                salons: allSalons,
                users: allUsers,
                allBookings,
            };
        }
        return null;
    }
    catch (error) {
        console.error('Error fetching live data:', error);
        return null;
    }
}
// Build role-specific system prompts (optimized for token limits)
function buildSystemPrompt(userRole, liveData) {
    if (userRole === 'CLIENT') {
        // Limit to top 5 items each to stay under token limits
        const topSalons = liveData?.salons?.slice(0, 5) || [];
        const topServices = liveData?.salonServices?.slice(0, 8) || [];
        const availableSlots = liveData?.slots?.filter((s) => s.isAvailable).slice(0, 5) || [];
        const recentBookings = liveData?.bookings?.slice(0, 3) || [];
        return `You are a helpful AI assistant for Fahari Salon Management System helping a CLIENT.

SALONS (${liveData?.salons?.length || 0} total, showing top 5):
${topSalons.map((s) => `${s.name} - ${s.city}`).join(', ') || 'None'}

SERVICES (${liveData?.salonServices?.length || 0} total):
${topServices.map((svc) => `${svc?.service?.name}: KSh${svc.price}`).join(', ') || 'None'}

SLOTS: ${availableSlots.length} available
BOOKINGS: ${recentBookings.length > 0 ? `${recentBookings.length} bookings` : 'None'}

Help explore salons, book services, and manage bookings. Be concise.`;
    }
    else if (userRole === 'SALON_OWNER') {
        const pendingCount = liveData?.ownerBookings?.filter((b) => b.status === 'PENDING').length || 0;
        const confirmedCount = liveData?.ownerBookings?.filter((b) => b.status === 'CONFIRMED').length || 0;
        const completedCount = liveData?.ownerBookings?.filter((b) => b.status === 'COMPLETED').length || 0;
        const availableSlotsCount = liveData?.ownerSlots?.filter((s) => s.isAvailable).length || 0;
        return `You are an AI assistant for Fahari helping a SALON_OWNER.

YOUR SALONS: ${liveData?.ownerSalons?.length || 0}
${liveData?.ownerSalons?.map(s => `- ${s.name} (${s.city})`).join('\n') || 'No salons'}

BOOKINGS: ${liveData?.ownerBookings?.length || 0} total
- Pending: ${pendingCount}
- Confirmed: ${confirmedCount}
- Completed: ${completedCount}

SERVICES: ${liveData?.ownerServices?.length || 0}
${liveData?.ownerServices?.slice(0, 5).map(s => `- ${s.service.name}: KSh${s.price}`).join('\n') || 'No services'}

AVAILABLE SLOTS: ${availableSlotsCount}

Help manage bookings, slots, and business insights. Be professional and data-driven.`;
    }
    else if (userRole === 'ADMIN') {
        const clientCount = liveData?.users?.filter((u) => u.role === 'CLIENT').length || 0;
        const ownerCount = liveData?.users?.filter((u) => u.role === 'SALON_OWNER').length || 0;
        const pendingBookings = liveData?.allBookings?.filter((b) => b.status === 'PENDING').length || 0;
        const confirmedBookings = liveData?.allBookings?.filter((b) => b.status === 'CONFIRMED').length || 0;
        return `You are an AI assistant for Fahari helping an ADMIN.

PLATFORM STATS:
- Salons: ${liveData?.salons?.length || 0}
${liveData?.salons?.slice(0, 3).map(s => `  • ${s.name} (${s.city}) - ${s.averageRating?.toFixed(1) || 'N/A'}⭐`).join('\n') || '  No salons'}

- Users: ${liveData?.users?.length || 0} (${clientCount} clients, ${ownerCount} owners)
- Bookings: ${liveData?.allBookings?.length || 0} (${pendingBookings} pending, ${confirmedBookings} confirmed)

Recent Bookings:
${liveData?.allBookings?.slice(0, 3).map(b => `- ${b.firstName} ${b.lastName} at ${b.salonName} (${b.status})`).join('\n') || 'None'}

Help monitor platform, analyze data, and provide insights. Be analytical and concise.`;
    }
    return 'You are a helpful assistant for Fahari Salon Management System.';
}
