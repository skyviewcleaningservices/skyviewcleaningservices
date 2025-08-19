# 🚀 Vercel Deployment Guide with Prisma

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: For code repository
3. **PostgreSQL Database**: 
   - **Option A**: Vercel Postgres (Recommended)
   - **Option B**: Supabase, Neon, or Railway
4. **Twilio Account**: For WhatsApp integration

## 🗄️ Database Setup

### **Option 1: Vercel Postgres (Recommended)**

1. **Create Vercel Postgres Database**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Create Postgres database
   vercel storage create postgres
   ```

2. **Get Database URL**:
   - Go to Vercel Dashboard → Storage → Your Database
   - Copy the `DATABASE_URL`

### **Option 2: Supabase (Free Tier)**

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Get connection string from Settings → Database

2. **Database URL Format**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

### **Option 3: Neon (Free Tier)**

1. **Create Neon Database**:
   - Go to [neon.tech](https://neon.tech)
   - Create new project
   - Get connection string

## 🔧 Local Setup for Production

### **1. Update Environment Variables**

Create `.env.local` with your production values:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Twilio WhatsApp API
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ADMIN_WHATSAPP_PHONE=whatsapp:+919623707524
TWILIO_TEMPLATE_CONTENT_SID=HXb5b62575e6e4ff6129ad7c8efe1f983e

# Contact Information
CONTACT_PHONE=+919623707524
```

### **2. Generate Prisma Client**

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (for development)
npx prisma db push

# Or create and run migrations (for production)
npx prisma migrate dev --name init
```

### **3. Test Database Connection**

```bash
# Test connection
npx prisma db pull

# View database in Prisma Studio
npx prisma studio
```

## 🚀 Deploy to Vercel

### **Method 1: Vercel CLI (Recommended)**

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   # Deploy to production
   vercel --prod
   
   # Or deploy to preview
   vercel
   ```

### **Method 2: GitHub Integration**

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure settings

## ⚙️ Vercel Configuration

### **Environment Variables**

Set these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `AC4184fe3a912f3f52fd8554f76ef494d8` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_auth_token` |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp number | `whatsapp:+14155238886` |
| `ADMIN_WHATSAPP_PHONE` | Admin WhatsApp number | `whatsapp:+919623707524` |
| `TWILIO_TEMPLATE_CONTENT_SID` | Template Content SID | `HXb5b62575e6e4ff6129ad7c8efe1f983e` |
| `CONTACT_PHONE` | Contact phone number | `+919623707524` |

### **Build Settings**

Vercel will automatically detect Next.js and use these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### **Function Settings**

Update `vercel.json` if needed:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## 🗄️ Database Migration

### **For Production Database**

1. **Create Migration**:
   ```bash
   npx prisma migrate dev --name production-init
   ```

2. **Deploy Migration**:
   ```bash
   # Deploy to production
   npx prisma migrate deploy
   ```

3. **Seed Database** (if needed):
   ```bash
   # Create seed script in package.json
   "prisma": {
     "seed": "tsx prisma/seed.ts"
   }
   ```

## 🔍 Post-Deployment Checklist

### **1. Database Verification**

```bash
# Check database connection
npx prisma db pull

# Verify tables exist
npx prisma studio
```

### **2. API Testing**

Test your endpoints:

```bash
# Test booking API
curl -X POST https://your-app.vercel.app/api/book \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"1234567890","address":"Test Address","serviceType":"deep-cleaning","frequency":"one-time","preferredDate":"2024-01-15","preferredTime":"14:00","bedrooms":"2","bathrooms":"2","additionalServices":"[]"}'

# Test admin setup
curl -X POST https://your-app.vercel.app/api/admin/setup
```

### **3. WhatsApp Integration**

Test WhatsApp notifications:

```bash
# Test Twilio curl implementation
curl -X POST https://your-app.vercel.app/api/test-twilio-curl \
  -H "Content-Type: application/json" \
  -d '{"authToken":"your_auth_token","bookingData":{"name":"Test User","serviceType":"deep-cleaning","date":"2024-01-15","time":"14:00"}}'
```

## 🛠️ Troubleshooting

### **Common Issues**

1. **Database Connection Error**:
   ```bash
   # Check DATABASE_URL format
   # Ensure database is accessible from Vercel
   # Verify SSL settings for production
   ```

2. **Prisma Client Generation**:
   ```bash
   # Ensure postinstall script runs
   # Check Prisma version compatibility
   # Verify schema syntax
   ```

3. **Environment Variables**:
   ```bash
   # Check all required variables are set
   # Verify no typos in variable names
   # Ensure proper formatting
   ```

### **Debug Commands**

```bash
# Check Prisma status
npx prisma status

# Validate schema
npx prisma validate

# Generate client
npx prisma generate

# Check database connection
npx prisma db pull
```

## 📊 Monitoring

### **Vercel Analytics**

- **Function Logs**: Vercel Dashboard → Functions
- **Performance**: Vercel Dashboard → Analytics
- **Errors**: Vercel Dashboard → Functions → Error Logs

### **Database Monitoring**

- **Vercel Postgres**: Built-in monitoring
- **Supabase**: Dashboard analytics
- **Neon**: Performance insights

## 🔄 Continuous Deployment

### **Automatic Deployments**

1. **GitHub Integration**: Automatic deployment on push
2. **Preview Deployments**: For pull requests
3. **Production Deployments**: For main branch

### **Database Migrations**

```bash
# Add to CI/CD pipeline
npx prisma migrate deploy
npx prisma generate
```

## 🎉 Success!

Your SkyView cleaning application is now deployed on Vercel with:

✅ **PostgreSQL Database**  
✅ **Prisma ORM**  
✅ **Next.js API Routes**  
✅ **WhatsApp Integration**  
✅ **Admin Dashboard**  
✅ **Booking System**  

Visit your deployed app at: `https://your-app.vercel.app`
