import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { authToken, bookingData } = await request.json();

    if (!authToken) {
      return NextResponse.json(
        { success: false, message: 'AuthToken is required' },
        { status: 400 }
      );
    }

    // Exact implementation of the provided curl command with booking data
    const accountSid = 'AC4184fe3a912f3f52fd8554f76ef494d8';
    const to = 'whatsapp:+919623707524'; // Updated to use the specified mobile number
    const from = 'whatsapp:+14155238886';
    const contentSid = 'HXb5b62575e6e4ff6129ad7c8efe1f983e';
    
    // Use booking data for content variables
    const contentVariables = {
      "1": bookingData?.name || "Customer",
      "2": bookingData?.serviceType?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Cleaning Service",
      "3": bookingData?.date || "TBD",
      "4": bookingData?.time || "TBD"
    };

    // Create form data exactly as in the curl command
    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('From', from);
    formData.append('ContentSid', contentSid);
    formData.append('ContentVariables', JSON.stringify(contentVariables));

    console.log('=== TWILIO CURL IMPLEMENTATION ===');
    console.log(`Account SID: ${accountSid}`);
    console.log(`To: ${to}`);
    console.log(`From: ${from}`);
    console.log(`ContentSid: ${contentSid}`);
    console.log(`ContentVariables: ${JSON.stringify(contentVariables)}`);
    console.log('==================================');

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    console.log('=== TWILIO RESPONSE ===');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', responseData);
    console.log('========================');

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Template message sent successfully',
        data: responseData,
        curlEquivalent: `curl 'https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json' -X POST \\
--data-urlencode 'To=${to}' \\
--data-urlencode 'From=${from}' \\
--data-urlencode 'ContentSid=${contentSid}' \\
--data-urlencode 'ContentVariables=${JSON.stringify(contentVariables)}' \\
-u ${accountSid}:[AuthToken]`
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: `HTTP ${response.status} ${response.statusText}`,
          error: responseData,
          curlEquivalent: `curl 'https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json' -X POST \\
--data-urlencode 'To=${to}' \\
--data-urlencode 'From=${from}' \\
--data-urlencode 'ContentSid=${contentSid}' \\
--data-urlencode 'ContentVariables=${JSON.stringify(contentVariables)}' \\
-u ${accountSid}:[AuthToken]`
        },
        { status: response.status }
      );
    }

  } catch (error) {
    console.error('Twilio curl implementation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Twilio Curl Implementation API',
    usage: 'POST /api/test-twilio-curl with { "authToken": "your_auth_token", "bookingData": { "name": "Customer Name", "serviceType": "deep-cleaning", "date": "2024-01-15", "time": "14:00" } }',
    description: 'Implements the exact curl command for testing Twilio WhatsApp template messages with booking data',
    curlCommand: `curl 'https://api.twilio.com/2010-04-01/Accounts/AC4184fe3a912f3f52fd8554f76ef494d8/Messages.json' -X POST \\
--data-urlencode 'To=whatsapp:+919623707524' \\
--data-urlencode 'From=whatsapp:+14155238886' \\
--data-urlencode 'ContentSid=HXb5b62575e6e4ff6129ad7c8efe1f983e' \\
--data-urlencode 'ContentVariables={"1":"Customer Name","2":"Service Type","3":"Date","4":"Time"}' \\
-u AC4184fe3a912f3f52fd8554f76ef494d8:[AuthToken]`,
    parameters: {
      accountSid: 'AC4184fe3a912f3f52fd8554f76ef494d8',
      to: 'whatsapp:+919623707524',
      from: 'whatsapp:+14155238886',
      contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
      contentVariables: { 
        "1": "Customer Name", 
        "2": "Service Type", 
        "3": "Date", 
        "4": "Time" 
      }
    }
  });
}
