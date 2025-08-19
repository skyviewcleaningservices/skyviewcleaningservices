import { NextRequest, NextResponse } from 'next/server';
import WhatsAppBusinessAPI from '../../services/WhatsAppBusinessAPI';

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    const whatsappService = WhatsAppBusinessAPI.getInstance();
    
    // Test message
    const testMessage = message || `🧪 *Test Message from SkyView Cleaning Services*

This is a test WhatsApp message to verify the integration is working correctly.

*Test Details:*
• Time: ${new Date().toLocaleString()}
• Phone: ${phone}
• Status: Testing

If you receive this message, the WhatsApp integration is working! ✅

Thank you for testing our system.`;

    const result = await whatsappService.sendTestMessage(phone, testMessage);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully (logged to console)',
        phone: phone,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to send test message', error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Test WhatsApp API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Test API',
    usage: 'POST /api/test-whatsapp with { "phone": "+1234567890", "message": "optional custom message" }',
    note: 'In development mode, messages are logged to console instead of being sent'
  });
}
