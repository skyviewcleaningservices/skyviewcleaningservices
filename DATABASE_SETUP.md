# Database Setup Guide for SkyView Cleaning

This guide explains how to set up the database for storing booking data alongside email functionality.

## 🗄️ Database Configuration

### 1. Database Configuration

The project is currently configured to use **SQLite** for development, which requires no additional setup. The database file (`dev.db`) will be created automatically.

For production, you can switch to PostgreSQL by updating the `prisma/schema.prisma` file:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

And create a `.env.local` file with your PostgreSQL connection:

```env
# Database Configuration (for PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/skyview_cleaning"

# Email Configuration (for production)
# SENDGRID_API_KEY=your_sendgrid_api_key_here
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password

# EmailJS Configuration (for client-side email)
# EMAILJS_SERVICE_ID=your_service_id
# EMAILJS_TEMPLATE_ID=your_template_id
# EMAILJS_PUBLIC_KEY=your_public_key
```

### 2. Database Options

#### Option A: SQLite (Current - Development)
- ✅ **Already configured** - No setup required
- ✅ **Database file**: `dev.db` (created automatically)
- ✅ **Perfect for development and testing**

#### Option B: PostgreSQL (Production)
1. Install PostgreSQL locally or use a cloud service
2. Create a database named `skyview_cleaning`
3. Update the DATABASE_URL with your credentials

#### Option C: Supabase (Free PostgreSQL)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your database URL from Settings > Database
4. Update the DATABASE_URL in your .env.local

#### Option D: Railway (Easy Deployment)
1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add a PostgreSQL database
4. Copy the DATABASE_URL to your .env.local

### 3. Database Setup Commands

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# View database in Prisma Studio
npx prisma studio
```

## 📊 Database Schema

The database includes a `Booking` table with the following fields:

```sql
model Booking {
  id                  String   @id @default(cuid())
  name                String
  email               String
  phone               String
  address             String
  serviceType         String
  frequency           String
  preferredDate       DateTime
  preferredTime       String
  bedrooms            String
  bathrooms           String
  additionalServices  String // JSON string for SQLite compatibility
  specialInstructions String?
  status              BookingStatus @default(PENDING)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum BookingStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}
```

## 🔄 How It Works

### Booking Flow:
1. **User submits form** → Data sent to `/api/book`
2. **Database storage** → Booking saved to PostgreSQL
3. **Email sending** → Notification sent to business email
4. **Response** → Success message with booking ID

### Fallback System:
- If database fails → Email still sent
- If email fails → Booking still saved
- If both fail → User gets error message

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_booking_table

# Reset database (development only)
npx prisma migrate reset

# View database
npx prisma studio

# Deploy migrations to production
npx prisma migrate deploy
```

## 📈 Database Management

### View Bookings
```bash
# Open Prisma Studio
npx prisma studio
```

### Query Bookings
```javascript
// Get all bookings
const bookings = await prisma.booking.findMany();

// Get pending bookings
const pendingBookings = await prisma.booking.findMany({
  where: { status: 'PENDING' }
});

// Get bookings by date range
const recentBookings = await prisma.booking.findMany({
  where: {
    createdAt: {
      gte: new Date('2024-01-01')
    }
  }
});
```

## 🚀 Production Deployment

### Vercel Deployment
1. Add environment variables in Vercel dashboard
2. Deploy your application
3. Run migrations: `npx prisma migrate deploy`

### Railway Deployment
1. Connect your GitHub repository
2. Add environment variables
3. Deploy automatically

### Database Backups
- Enable automatic backups in your database provider
- Set up regular backup schedules
- Test restore procedures

## 🔍 Monitoring

### Database Health
- Monitor connection pool usage
- Check query performance
- Set up alerts for errors

### Booking Analytics
- Track booking volume over time
- Monitor conversion rates
- Analyze popular services

## 🚨 Troubleshooting

### Common Issues:
1. **Connection Error**: Check DATABASE_URL format
2. **Migration Failed**: Reset database and re-run migrations
3. **Prisma Client Error**: Run `npx prisma generate`
4. **Permission Error**: Check database user permissions

### Debug Commands:
```bash
# Check database connection
npx prisma db pull

# Validate schema
npx prisma validate

# Format schema
npx prisma format
```

## 📞 Support

For database issues:
1. Check Prisma documentation
2. Review database provider docs
3. Check environment variables
4. Test connection manually
