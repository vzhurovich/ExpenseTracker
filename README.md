# Expense Tracker

A mobile-friendly web expense tracking application for non-profit organizations. Staff members can submit expense claims with receipt images (upload or take a photo), and administrators can approve or reject requests. The app uses OCR to extract receipt totals and supports a full approval workflow.

## Features
- User authentication (staff/admin)
- Upload or capture receipt images
- OCR extraction of total sum
- Expense submission and approval workflow
- Admin dashboard for approvals
- Data storage for analysis
- Mobile-first responsive design

## Technology Stack
- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: SQLite
- OCR: Tesseract.js

---

## Build and Run Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Return to root
dcd ..
```

### 2. Create Required Directories

```bash
# Create uploads directory for server
mkdir -p server/uploads

# Create data directory for SQLite database
mkdir -p server/data
```

### 3. Start the Development Servers

**Option A: Start both servers simultaneously (Recommended)**
```bash
npm run dev
```

**Option B: Start servers separately**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

### 4. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- API Health Check: http://localhost:5001/api/health

### 5. Production Build

```bash
# Build the client
cd client
npm run build

# Build the server
cd ../server
npm run build

# Start production server
npm start
```

### 6. Default Admin Credentials
- Email: admin@nonprofit.org
- Password: admin123

### 7. Troubleshooting
- Ensure `server/data` and `server/uploads` directories exist
- Change ports in `.env` files if needed
- Reset database: `rm server/data/expense_tracker.db`

---

For more details, see the code and comments in the respective `client` and `server` folders. 