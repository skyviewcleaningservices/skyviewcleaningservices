import { NextRequest, NextResponse } from 'next/server';
import { SERVED_PUNE_AREAS } from '@/lib/areas';

const CONTACT_LINE = 'call or WhatsApp us at +91 96230 29057';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const normalize = (text: string) => text.toLowerCase();

const hasWord = (text: string, words: string[]) =>
  words.some(word => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));

interface Intent {
  name: string;
  test: (text: string) => boolean;
  reply: string | ((text: string) => string);
}

const INTENTS: Intent[] = [
  {
    name: 'greeting',
    test: text => hasWord(text, ['hi', 'hello', 'hey', 'namaste']),
    reply: "Hi there! 👋 I'm SkyView's assistant. Ask me about our services, coverage areas, pricing, or how booking works.",
  },
  {
    name: 'thanks',
    test: text => hasWord(text, ['thanks', 'thank', 'thankyou']),
    reply: "You're welcome! Let me know if there's anything else you'd like to know, or tap Book Now whenever you're ready.",
  },
  {
    name: 'bye',
    test: text => hasWord(text, ['bye', 'goodbye', 'byebye']),
    reply: `Take care! You can always come back with more questions, or ${CONTACT_LINE} if you'd like to talk to the team directly.`,
  },
  {
    name: 'pricing',
    test: text => hasWord(text, ['price', 'pricing', 'cost', 'costs', 'charge', 'charges', 'fee', 'fees', 'rate', 'rates']) || text.includes('how much'),
    reply: `Pricing depends on your flat type, the service you pick, and any add-ons, so our team confirms it case by case rather than a fixed price list. The quickest way to get a quote is to tap "Book Now" (takes under a minute) or ${CONTACT_LINE}.`,
  },
  {
    name: 'area-served',
    test: text => SERVED_PUNE_AREAS.some(area => text.includes(area.toLowerCase())),
    reply: text => {
      const matched = SERVED_PUNE_AREAS.find(area => text.includes(area.toLowerCase()));
      return `Yes, we currently serve ${matched}! You can go ahead and tap "Book Now" to get started, and our team will confirm the details.`;
    },
  },
  {
    name: 'area-general',
    test: text => hasWord(text, ['area', 'areas', 'location', 'cover', 'coverage', 'pune']),
    reply: `We currently serve ${SERVED_PUNE_AREAS.join(', ')} in Pune. If your area isn't listed, ${CONTACT_LINE} and we'll let you know if we can still help.`,
  },
  {
    name: 'addons',
    test: text => hasWord(text, ['window', 'carpet', 'oven', 'fridge', 'balcony', 'upholstery']),
    reply: 'Yes, that\'s available as an add-on! Along with Window, Oven, Carpet, Fridge, Deep Kitchen, Bathroom Deep, and Balcony Cleaning, you can select any add-ons you need right in the booking form.',
  },
  {
    name: 'property-type',
    test: text => hasWord(text, ['bhk', 'studio', 'penthouse', 'flat', 'apartment']),
    reply: 'We clean every property size — Studio, 1 BHK, 2 BHK, 3 BHK, 4 BHK, and Penthouse. Just select your flat type when you book and we\'ll tailor the service accordingly.',
  },
  {
    name: 'booking-process',
    test: text => hasWord(text, ['book', 'booking', 'schedule', 'appointment', 'reserve']),
    reply: 'Booking is simple: tap "Book Now", pick your service and flat type, choose a date/time, and share your contact details — takes under a minute. Our team will then call you within 3 hours to confirm everything.',
  },
  {
    name: 'contact',
    test: text => hasWord(text, ['contact', 'phone', 'number', 'call', 'whatsapp', 'email', 'reach']),
    reply: 'You can reach us anytime at +91 96230 29057 (call or WhatsApp) or email skyviewcleaningservices@gmail.com — happy to help!',
  },
  {
    name: 'trust',
    test: text => hasWord(text, ['rating', 'ratings', 'review', 'reviews', 'trust', 'trusted', 'insured', 'bonded', 'guarantee']),
    reply: "We're trusted by 5,000+ Pune homes with a 4.8/5 rating from 2,847 reviews, and our team is fully insured and bonded — your home is in safe hands.",
  },
  {
    name: 'timing',
    test: text => hasWord(text, ['hour', 'hours', 'timing', 'time', 'when', 'available', 'today', 'tomorrow']),
    reply: `You can pick whatever date and time works for you in the booking form. Same-day service is sometimes available too — ${CONTACT_LINE} to check for your date.`,
  },
  {
    name: 'services',
    test: text => hasWord(text, ['service', 'services', 'offer', 'clean', 'cleaning']),
    reply: 'We offer three core services: Deep Cleaning (move-in/move-out, seasonal), General Cleaning (weekly/bi-weekly maintenance), and Specialized Services (post-construction, carpets, windows, appliances). Add-ons like kitchen, bathroom, and balcony cleaning are also available.',
  },
];

const FALLBACK_REPLY = `I don't have a specific answer for that, but our team can help directly! ${CONTACT_LINE}, or tap "Book Now" to get started.`;

function getReply(userText: string): string {
  const normalized = normalize(userText);

  for (const intent of INTENTS) {
    if (intent.test(normalized)) {
      return typeof intent.reply === 'function' ? intent.reply(normalized) : intent.reply;
    }
  }

  return FALLBACK_REPLY;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage?.content) {
      return NextResponse.json({ success: false, message: 'No message provided.' }, { status: 400 });
    }

    const reply = getReply(lastUserMessage.content);
    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('Assistant API error:', error);
    return NextResponse.json(
      { success: false, message: `Something went wrong. Please ${CONTACT_LINE}.` },
      { status: 500 }
    );
  }
}
