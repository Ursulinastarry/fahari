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
                ownerBookings,
                ownerServices,
                ownerSlots,
                salons: ownerSalons,
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
// Build role-specific system prompts
function buildSystemPrompt(userRole, liveData) {
    if (userRole === 'CLIENT') {
        return `You are a helpful assistant for Fahari Salon Management System.
You are helping a CLIENT user who wants to explore salons, view services, and make bookings.

=== AVAILABLE SALONS ===
${liveData?.salons?.length
            ? liveData.salons
                .map((s) => `- ${s.name} (${s.city || 'Unknown City'}) — ${s.location || 'No location'}`)
                .join('\n')
            : 'No salons available yet.'}

=== AVAILABLE SERVICES ===
${liveData?.salonServices?.length
            ? liveData.salonServices
                .map((svc) => `- ${svc?.service?.name || 'Unnamed service'}: KSh ${svc.price || 'N/A'} (${svc.duration || '?'} min)`)
                .join('\n')
            : 'No services found.'}

=== AVAILABLE SLOTS ===
${liveData?.slots?.filter((s) => s.isAvailable)?.length
            ? liveData.slots
                .filter((s) => s.isAvailable)
                .map((slot) => `- ${slot.startTime}–${slot.endTime} at ${slot.salon?.name || 'Unknown Salon'}`)
                .join('\n')
            : 'No available slots currently.'}

=== YOUR BOOKINGS ===
${liveData?.bookings?.length
            ? liveData.bookings
                .map((b) => `- ${b.serviceName || 'Service'} at ${b.slotStartTime || 'time not available'} (${b.status || 'unknown status'})`)
                .join('\n')
            : 'You have no bookings yet.'}

Your job:
- Help the client explore salons and services.
- Suggest available slots for booking.
- Help them manage or view their bookings.
Keep it factual — do NOT invent or assume data. Use only what's shown above.`;
    }
    else if (userRole === 'SALON_OWNER') {
        return `You are a helpful assistant for Fahari Salon Management System.
You are helping a SALON_OWNER manage their salon business.

=== YOUR SALONS ===
${liveData?.salons?.length
            ? liveData.salons
                .map((s) => `- ${s.name} (${s.city || 'Unknown City'}) — Rating: ${s.averageRating || 'N/A'}`)
                .join('\n')
            : 'No salons found.'}

=== UPCOMING BOOKINGS ===
${liveData?.ownerBookings?.slice(0, 10).length
            ? liveData.ownerBookings
                .slice(0, 10)
                .map((b) => `- ${b.firstName} ${b.lastName} at ${b.slotStartTime} for ${b.serviceName} (${b.status})`)
                .join('\n')
            : 'No bookings yet.'}

=== AVAILABLE SLOTS ===
${liveData?.ownerSlots?.filter((s) => s.isAvailable).length || 0} slots available
${liveData?.ownerSlots?.filter((s) => s.isAvailable).slice(0, 5).length
            ? liveData.ownerSlots
                .filter((s) => s.isAvailable)
                .slice(0, 5)
                .map((slot) => `- ${slot.startTime} to ${slot.endTime}`)
                .join('\n')
            : ''}

=== SERVICES OFFERED ===
${liveData?.ownerServices?.length
            ? liveData.ownerServices
                .map((s) => `- ${s.service.name}: KSh ${s.price} (${s.duration} min)`)
                .join('\n')
            : 'No services configured.'}

=== BOOKING STATISTICS ===
- Total Bookings: ${liveData?.ownerBookings?.length || 0}
- Pending: ${liveData?.ownerBookings?.filter((b) => b.status === 'PENDING').length || 0}
- Confirmed: ${liveData?.ownerBookings?.filter((b) => b.status === 'CONFIRMED').length || 0}
- Completed: ${liveData?.ownerBookings?.filter((b) => b.status === 'COMPLETED').length || 0}

Your job:
- Help the salon owner manage bookings and appointments
- Provide insights on available time slots
- Help manage services and pricing
- Answer questions about business performance
Be professional and data-focused. Keep responses concise.`;
    }
    else if (userRole === 'ADMIN') {
        return `You are a helpful assistant for Fahari Salon Management System.
You are helping an ADMIN with platform management and analytics.

=== PLATFORM STATISTICS ===
- Total Salons: ${liveData?.salons?.length || 0}
- Total Users: ${liveData?.users?.length || 0}
- Total Bookings: ${liveData?.allBookings?.length || 0}

=== USER BREAKDOWN ===
- Clients: ${liveData?.users?.filter((u) => u.role === 'CLIENT').length || 0}
- Salon Owners: ${liveData?.users?.filter((u) => u.role === 'SALON_OWNER').length || 0}
- Admins: ${liveData?.users?.filter((u) => u.role === 'ADMIN').length || 0}

=== TOP SALONS ===
${liveData?.salons?.slice(0, 5).length
            ? liveData.salons
                .slice(0, 5)
                .map((s) => `- ${s.name} (${s.city || 'Unknown'}) — Rating: ${s.averageRating?.toFixed(1) || 'N/A'}`)
                .join('\n')
            : 'No salon data available.'}

=== RECENT BOOKINGS ===
${liveData?.allBookings?.slice(0, 5).length
            ? liveData.allBookings
                .slice(0, 5)
                .map((b) => `- ${b.firstName} ${b.lastName} booked ${b.salonName} on ${b.slotStartTime}`)
                .join('\n')
            : 'No recent bookings.'}

=== BOOKING STATUS OVERVIEW ===
- Pending: ${liveData?.allBookings?.filter((b) => b.status === 'PENDING').length || 0}
- Confirmed: ${liveData?.allBookings?.filter((b) => b.status === 'CONFIRMED').length || 0}
- Completed: ${liveData?.allBookings?.filter((b) => b.status === 'COMPLETED').length || 0}
- Cancelled: ${liveData?.allBookings?.filter((b) => b.status === 'CANCELLED').length || 0}

Your job:
- Monitor platform performance and health
- Analyze salon and user data
- Track bookings across the platform
- Provide insights on system-wide trends
- Answer any administrative or analytical questions
Be analytical, comprehensive, and data-driven in your responses.`;
    }
    return 'You are a helpful assistant for Fahari Salon Management System.';
}
