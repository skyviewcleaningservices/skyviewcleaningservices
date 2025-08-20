import { NextRequest, NextResponse } from 'next/server';
import WhatsAppBusinessAPI from '../../services/WhatsAppBusinessAPI';

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();

    if (!phone) {
      return NextResponse.json({
        success: false,
        message: 'Phone number is required'
      }, { status: 400 });
    }

    const whatsappService = WhatsAppBusinessAPI.getInstance();
    
    // Check configuration
    const isConfigured = whatsappService.isConfigured();
    const isSandbox = whatsappService.getSandboxStatus();
    
    console.log('WhatsApp Test Configuration:', {
      isConfigured,
      isSandbox,
      phone,
      hasMessage: !!message
    });

    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        message: 'WhatsApp not configured',
        details: {
          hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
          hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_WHATSAPP_FROM
        }
      }, { status: 500 });
    }

    // Send test message
    const testMessage = message || 'This is a test message from SkyView Cleaning Services WhatsApp integration.';
    const result = await whatsappService.sendTestMessage(phone, testMessage);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test message sent successfully' : 'Failed to send test message',
      error: result.error,
      details: {
        isSandbox,
        phone,
        messageLength: testMessage.length
      }
    });

  } catch (error) {
    console.error('WhatsApp test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const whatsappService = WhatsAppBusinessAPI.getInstance();
    
    const isConfigured = whatsappService.isConfigured();
    const isSandbox = whatsappService.getSandboxStatus();
    
    return NextResponse.json({
      success: true,
      configured: isConfigured,
      sandbox: isSandbox,
      environment: {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_WHATSAPP_FROM,
        adminPhone: process.env.ADMIN_WHATSAPP_PHONE
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
