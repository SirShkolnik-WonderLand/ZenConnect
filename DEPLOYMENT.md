# ZenConnect Deployment Guide

## 🚀 Deploying to Render

### Prerequisites

1. GitHub repository with your code
2. Render account (https://render.com)
3. PostgreSQL database (can be created on Render)

### Step 1: Prepare Your Repository

Your repository is already set up with the proper structure and configuration files:

- ✅ `render.yaml` - Render deployment configuration
- ✅ `.gitignore` files for each service
- ✅ `package.json` files with proper scripts
- ✅ Environment variable templates

### Step 2: Push to GitHub

```bash
# Add your GitHub remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/zenconnect.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Render

1. **Connect Repository**:
   - Go to https://render.com/dashboard
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository containing your ZenConnect code

2. **Configure Services**:
   Render will automatically detect the `render.yaml` file and create:
   - PostgreSQL database (`zenconnect-db`)
   - Backend service (`zenconnect-backend`)
   - Frontend service (`zenconnect-frontend`)

3. **Environment Variables**:
   The services will be automatically configured with the necessary environment variables as defined in `render.yaml`.

### Step 4: Database Setup

After deployment, you'll need to run database migrations:

1. Go to your backend service in Render dashboard
2. Open the "Shell" tab
3. Run the migration command:
```bash
cd database && npm run migrate:deploy
```

### Step 5: Verify Deployment

1. **Frontend**: Your frontend will be available at `https://zenconnect-frontend.onrender.com`
2. **Backend**: Your API will be available at `https://zenconnect-backend.onrender.com`
3. **Health Check**: Visit `https://zenconnect-backend.onrender.com/api/healthz`

## 🔧 Manual Deployment (Alternative)

If you prefer to deploy services individually:

### Database Service

1. Create a PostgreSQL database on Render
2. Note the connection string

### Backend Service

1. Create a new Web Service
2. Connect your GitHub repository
3. Set build command: `cd backend && npm install && npm run build`
4. Set start command: `cd backend && npm start`
5. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: Generate a secure secret
   - `FRONTEND_URL`: Your frontend URL (will be available after frontend deployment)

### Frontend Service

1. Create a new Web Service
2. Connect your GitHub repository
3. Set build command: `cd frontend && npm install && npm run build`
4. Set start command: `cd frontend && npm start`
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend service URL
   - `NEXTAUTH_SECRET`: Generate a secure secret
   - `NEXTAUTH_URL`: Your frontend service URL

## 🔐 Environment Variables

### Required Variables

**Backend:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens
- `FRONTEND_URL`: Frontend service URL

**Frontend:**
- `NEXT_PUBLIC_API_URL`: Backend service URL
- `NEXTAUTH_SECRET`: NextAuth.js secret
- `NEXTAUTH_URL`: Frontend service URL

**Database:**
- `DATABASE_URL`: PostgreSQL connection string

### Optional Variables

- `MAILCHIMP_API_KEY`: For email integration
- `MAILCHIMP_SERVER_PREFIX`: Mailchimp server prefix
- `MAILCHIMP_LIST_ID`: Mailchimp list ID

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are listed in `package.json`
   - Verify TypeScript compilation with `npm run type-check`

2. **Database Connection Issues**:
   - Ensure `DATABASE_URL` is correctly set
   - Check that database migrations have been run

3. **CORS Issues**:
   - Verify `FRONTEND_URL` is set correctly in backend
   - Check that frontend is using correct API URL

4. **Environment Variable Issues**:
   - Double-check all required environment variables are set
   - Ensure secrets are properly generated and secure

### Logs and Debugging

- Check service logs in Render dashboard
- Use health check endpoints to verify service status
- Monitor database connections and query performance

## 📊 Monitoring

After deployment, monitor:

- Service uptime and response times
- Database performance and connections
- Error rates and logs
- User authentication flows

## 🔄 Updates and Maintenance

To update your deployment:

1. Push changes to your GitHub repository
2. Render will automatically redeploy affected services
3. Run database migrations if schema changes were made
4. Monitor deployment status in Render dashboard

## 🔒 Security Considerations

- Use strong, unique secrets for all environment variables
- Enable HTTPS (automatically handled by Render)
- Regularly update dependencies
- Monitor for security vulnerabilities
- Implement proper authentication and authorization
