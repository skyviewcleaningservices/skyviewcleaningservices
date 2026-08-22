import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_MESSAGE = "Sorry, I'm having trouble responding right now. Please call or WhatsApp us at +91 96230 29057 and we'll help right away.";

const SYSTEM_PROMPT = `You are the virtual assistant on the SkyView Cleaning Services website, a professional home/office cleaning company in Pune, Maharashtra, India.

What you know:
- Services: Deep Cleaning (move-in/move-out, seasonal deep cleans), General Cleaning (weekly/bi-weekly maintenance), and Specialized Services (post-construction, carpet/upholstery, window/glass, oven/appliance cleaning).
- Add-on services: Window Cleaning, Oven Cleaning, Carpet Cleaning, Fridge Cleaning, Deep Kitchen Cleaning, Bathroom Deep Cleaning, Balcony Cleaning.
- Property types supported: Studio, 1 BHK, 2 BHK, 3 BHK, 4 BHK, Penthouse.
- Frequency options: one-time, weekly, bi-weekly, monthly.
- Areas currently served in Pune: Kothrud, Baner, Wakad, Hinjewadi, Viman Nagar, Koregaon Park, Kharadi, Aundh, Camp, Hadapsar. If asked about an area not on this list, say you're not sure it's covered yet and suggest they check via the booking form or WhatsApp.
- Contact: phone/WhatsApp +91 96230 29057, email skyviewcleaningservices@gmail.com.
- After someone submits a booking through the website form, the team calls within 3 hours to confirm.
- Trusted by 5,000+ Pune homes, 4.8/5 average rating from 2,847 reviews, insured & bonded team.

What you don't know: exact prices. Pricing depends on flat type, service type, and add-ons, and is confirmed by the team case by case — never invent a number. When asked about price, explain that and point them to the "Book Now" button (takes under a minute) or WhatsApp for a quick quote.

How to behave:
- Be warm, concise, and helpful — 2 to 4 sentences per reply, not a wall of text.
- Answer questions and gently guide the visitor toward booking or contacting the team — don't wander into long tangents.
- If asked something unrelated to cleaning services or this business, politely redirect back to how you can help with their cleaning needs.
- Never claim to book anything yourself — you can only guide them to the booking form or WhatsApp.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];

    if (messages.length === 0) {
      return NextResponse.json({ success: false, message: 'No message provided.' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set');
      return NextResponse.json({ success: false, message: FALLBACK_MESSAGE }, { status: 503 });
    }

    // Keep the request small — only the recent conversation is needed for context.
    const recentMessages = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: recentMessages,
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, await response.text());
      return NextResponse.json({ success: false, message: FALLBACK_MESSAGE }, { status: 502 });
    }

    const data = await response.json();
    const reply = data?.content?.[0]?.text?.trim();

    if (!reply) {
      return NextResponse.json({ success: false, message: FALLBACK_MESSAGE }, { status: 502 });
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('Assistant API error:', error);
    return NextResponse.json({ success: false, message: FALLBACK_MESSAGE }, { status: 500 });
  }
}
