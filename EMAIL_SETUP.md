# Email Setup Guide for SkyView Cleaning Booking Form

This guide explains how to set up email functionality for the booking form so you receive booking submissions via email.

## 🚀 Quick Setup Options

### Option 1: EmailJS (Recommended for Quick Setup)

1. **Sign up for EmailJS**
   - Go to [https://www.emailjs.com/](https://www.emailjs.com/)
   - Create a free account
   - Verify your email

2. **Create an Email Service**
   - In EmailJS dashboard, go to "Email Services"
   - Click "Add New Service"
   - Choose your email provider (Gmail, Outlook, etc.)
   - Follow the setup instructions

3. **Create an Email Template**
   - Go to "Email Templates"
   - Click "Create New Template"
   - Use this template:

```html
<h2>New Booking Request - SkyView Cleaning Services</h2>

<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Customer Information</h3>
  <p><strong>Name:</strong> {{from_name}}</p>
  <p><strong>Email:</strong> {{from_email}}</p>
  <p><strong>Phone:</strong> {{from_phone}}</p>
  <p><strong>Address:</strong> {{customer_address}}</p>
</div>

<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Service Details</h3>
  <p><strong>Service Type:</strong> {{service_type}}</p>
  <p><strong>Frequency:</strong> {{frequency}}</p>
  <p><strong>Preferred Date:</strong> {{preferred_date}}</p>
  <p><strong>Preferred Time:</strong> {{preferred_time}}</p>
</div>

<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Property Details</h3>
  <p><strong>Bedrooms:</strong> {{bedrooms}}</p>
  <p><strong>Bathrooms:</strong> {{bathrooms}}</p>
</div>

<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Additional Services</h3>
  <p>{{additional_services}}</p>
</div>

<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Special Instructions</h3>
  <p>{{special_instructions}}</p>
</div>

<div style="background-color: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0; color: #3730a3;"><strong>Submitted on:</strong> {{submission_date}}</p>
</div>
```

4. **Get Your Credentials**
   - Copy your Service ID, Template ID, and Public Key
   - Update the `EmailService.ts` file with your credentials:

```typescript
const EMAILJS_CONFIG = {
  SERVICE_ID: 'your_service_id_here',
  TEMPLATE_ID: 'your_template_id_here',
  PUBLIC_KEY: 'your_public_key_here',
};
```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up for SendGrid**
   - Go to [https://sendgrid.com/](https://sendgrid.com/)
   - Create an account
   - Verify your domain

2. **Install SendGrid**
   ```bash
   npm install @sendgrid/mail
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file:
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   ```

4. **Update the API Route**
   Uncomment and configure the SendGrid code in `src/app/api/book/route.ts`

### Option 3: Nodemailer with SMTP

1. **Install Nodemailer**
   ```bash
   npm install nodemailer
   ```

2. **Set up Environment Variables**
   Create a `.env.local` file:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

3. **Update the API Route**
   Uncomment and configure the Nodemailer code in `src/app/api/book/route.ts`

## 🔧 Configuration

### Update Email Address
In both `EmailService.ts` and `src/app/api/book/route.ts`, update the recipient email:

```typescript
to_email: 'your-business-email@domain.com'
```

### Environment Variables
For production, create a `.env.local` file with your email service credentials.

## 📧 How It Works

The booking form has multiple fallback options:

1. **Primary**: API Route (`/api/book`) - Sends email via server-side email service
2. **Fallback 1**: EmailJS - Client-side email service
3. **Fallback 2**: Mailto Link - Opens user's email client

## 🧪 Testing

1. Fill out the booking form
2. Submit the form
3. Check your email inbox
4. Check the browser console for logs

## 📝 Email Content

The email includes:
- Customer contact information
- Service details and preferences
- Property information
- Additional services requested
- Special instructions
- Submission timestamp

## 🚨 Troubleshooting

### EmailJS Issues
- Verify your credentials are correct
- Check EmailJS dashboard for any errors
- Ensure your email service is properly configured

### API Route Issues
- Check server logs for errors
- Verify environment variables are set
- Test email service credentials

### General Issues
- Check browser console for errors
- Verify all required fields are filled
- Test with different email addresses

## 📞 Support

If you need help setting up email functionality:
1. Check the EmailJS documentation
2. Review the SendGrid setup guide
3. Test with the mailto fallback option
4. Check browser console for error messages
