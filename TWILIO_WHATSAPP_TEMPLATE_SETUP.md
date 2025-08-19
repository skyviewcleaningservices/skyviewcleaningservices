# Twilio WhatsApp Template Setup Guide

## 🚨 Issue Identified
The WhatsApp messages are not being sent because:
1. `alert()` function is not available in server-side code
2. Missing Twilio Auth Token
3. Template might not be properly configured

## 🔧 Step-by-Step Fix

### Step 1: Create Twilio WhatsApp Template

1. **Login to Twilio Console**: https://console.twilio.com/
2. **Navigate to Messaging > Content Editor**
3. **Create New Template**:

```
Template Name: booking_confirmation
Category: Marketing
Language: English (US)

Template Content:
🎉 *Booking Confirmation - SkyView Cleaning Services*

Dear {{1}},

Thank you for choosing SkyView Cleaning Services! Your booking has been successfully received.

*Booking Details:*
• Service: {{2}}
• Date: {{3}}
• Time: {{4}}
• Address: {{5}}

We will contact you within 24 hours to confirm your appointment.

For any questions, please contact us at +1234567890.

Thank you for trusting SkyView Cleaning Services! 🏠✨
```

### Step 2: Get Template ContentSid

After creating the template, you'll get a ContentSid like: `HXb5b62575e6e4ff6129ad7c8efe1f983e`

### Step 3: Set Environment Variables

Create `.env.local` file in your project root:

```bash
# Twilio WhatsApp Business API
TWILIO_ACCOUNT_SID=AC4184fe3a912f3f52fd8554f76ef494d8
TWILIO_AUTH_TOKEN=your_actual_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Admin WhatsApp phone number
ADMIN_WHATSAPP_PHONE=whatsapp:+917840938282

# Template ContentSid
TWILIO_TEMPLATE_CONTENT_SID=your_new_template_content_sid
```

### Step 4: Update WhatsApp Service

The service has been fixed to remove the `alert()` function and properly handle template messages.

## 🧪 Testing the Fix

### Test 1: Check Environment Variables
```bash
curl -X GET http://localhost:3001/api/test-whatsapp-template
```

### Test 2: Test Template Message
```bash
curl -X POST http://localhost:3001/api/test-whatsapp-template \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+917840938282",
    "date": "2025-08-20",
    "time": "14:00",
    "name": "Test Customer",
    "serviceType": "deep-cleaning",
    "address": "123 Test Street"
  }'
```

### Test 3: Test Full Booking
```bash
curl -X POST http://localhost:3001/api/book \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "email": "test@example.com",
    "phone": "+917840938282",
    "address": "123 Test Street",
    "serviceType": "deep-cleaning",
    "frequency": "one-time",
    "date": "2025-08-20",
    "time": "14:00",
    "bedrooms": "2",
    "bathrooms": "2",
    "additionalServices": ["Window Cleaning"],
    "specialInstructions": "Test booking"
  }'
```

## 📋 Alternative Template Options

### Option 1: Simple Confirmation Template
```
Template Name: simple_booking_confirmation
Category: Marketing

Content:
Hi {{1}}! Your {{2}} booking for {{3}} at {{4}} has been confirmed. We'll contact you within 24 hours. Thank you! 🏠✨
```

### Option 2: Detailed Template
```
Template Name: detailed_booking_confirmation
Category: Marketing

Content:
🎉 *SkyView Cleaning Services - Booking Confirmed*

Dear {{1}},

Your {{2}} service has been booked successfully!

📅 Date: {{3}}
⏰ Time: {{4}}
📍 Address: {{5}}

We'll contact you within 24 hours to confirm details.

Thank you for choosing SkyView! 🏠✨
```

## 🔍 Troubleshooting

### Issue 1: "Authentication Error"
- Check if `TWILIO_AUTH_TOKEN` is set correctly
- Verify the token in Twilio Console

### Issue 2: "Template not found"
- Verify `ContentSid` is correct
- Check if template is approved in Twilio Console

### Issue 3: "Invalid phone number"
- Ensure phone numbers include country code
- Format: `whatsapp:+917840938282`

### Issue 4: "Message not delivered"
- Check if recipient has joined your Twilio WhatsApp sandbox
- Send "join <sandbox-code>" to +14155238886

## 📞 Twilio WhatsApp Sandbox Setup

1. **Get Sandbox Code**: In Twilio Console > Messaging > Try it out > Send a WhatsApp message
2. **Join Sandbox**: Send "join <sandbox-code>" to +14155238886 from your phone
3. **Test Message**: Send a test message to verify connection

## 🚀 Production Setup

For production, you'll need:
1. **Verified Business Account** in Twilio
2. **Approved WhatsApp Business API** access
3. **Custom Phone Number** (not sandbox)
4. **Approved Templates** by WhatsApp

## 📊 Template Variables Mapping

| Variable | Description | Example |
|----------|-------------|---------|
| {{1}} | Customer Name | "John Doe" |
| {{2}} | Service Type | "Deep Cleaning" |
| {{3}} | Date | "8/20" |
| {{4}} | Time | "14:00" |
| {{5}} | Address | "123 Main St" |

## ✅ Next Steps

1. **Create the template** in Twilio Console
2. **Get the ContentSid** and update environment variables
3. **Test with your phone number**
4. **Verify message delivery**

The fix is now complete and ready for testing! 🎉
