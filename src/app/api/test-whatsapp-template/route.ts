import { NextRequest, NextResponse } from 'next/server';
import WhatsAppBusinessAPI from '../../services/WhatsAppBusinessAPI';

export async function POST(request: NextRequest) {
  try {
    const { phone, name } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    const whatsappService = WhatsAppBusinessAPI.getInstance();
    
    // Template ContentSid from your Twilio account
    const templateContentSid = process.env.TWILIO_TEMPLATE_CONTENT_SID || 'HX3ccc38b81ee21fc43b8fcf70296a0b4c';
    
    const customerName = name || 'Test Customer';

    // Simple template variables - just customer name
    const templateVariables = {
      "1": customerName // Customer name
    };

    console.log('=== WHATSAPP TEMPLATE TEST ===');
    console.log(`To: ${phone}`);
    console.log(`Template ContentSid: ${templateContentSid}`);
    console.log(`Template Variables:`, templateVariables);
    console.log('================================');

    const result = await whatsappService.sendTemplateMessage(
      phone,
      templateContentSid,
      templateVariables
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Template message sent successfully',
        phone: phone,
        templateContentSid: templateContentSid,
        templateVariables: templateVariables,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to send template message', error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Test WhatsApp Template API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Template Test API',
    usage: 'POST /api/test-whatsapp-template with { "phone": "+917840938282", "name": "Test Customer" }',
    note: 'Uses Twilio WhatsApp template with ContentSid from environment variable',
    templateVariables: {
      "1": "Customer Name"
    },
    templateMessage: 'Hi {{1}}! Your booking is successful. If you have any query please call on 9623707524.'
  });
}
