# Vehicle Mileage Tracker

A full-stack Progressive Web Application (PWA) for fleet vehicle mileage tracking and management, built with a modern VS Code-inspired UI.

## Features

- **Dashboard** - Real-time fleet statistics, mileage charts, and activity feed
- **Vehicle Management** - Register, edit, and track all fleet vehicles
- **Mileage Tracking** - Log odometer readings with validation and rollback prevention
- **Alert System** - Automatic warnings when vehicles approach or exceed mileage limits
- **Role-Based Access** - Admin and Driver roles with appropriate permissions
- **Data Import** - Upload CSV/Excel files for historical vehicle and mileage data
- **Reports** - Export fleet summaries, mileage history, and driver usage reports
- **Multiple Themes** - 7 themes: Dark, Light, High Contrast, Midnight Blue, Monokai, Nord, Sunset
- **PWA Support** - Install as a native app, works offline with data sync
- **Responsive Design** - Mobile-friendly with bottom navigation on small screens

## Tech Stack

### Frontend
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- Chart.js for data visualization
- SheetJS (XLSX) for Excel file parsing
- Service Worker for offline support

### Backend
- Node.js + Express.js
- SQLite (via better-sqlite3) for data persistence
- JWT authentication with bcrypt password hashing
- RESTful API with role-based middleware

## Getting Started

### Prerequisites
- Node.js v18 or higher
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/SAMUEL-NTI-SARPONG/vehicle-mileage-tracker.git
cd vehicle-mileage-tracker

# Install dependencies
npm install

# Start the server
npm start
```

The application will be available at `http://localhost:3000`

### Development

```bash
npm run dev
```

### Default Login Credentials

| Username | Password | Role   |
|----------|----------|--------|
| admin    | admin    | Admin  |
| driver   | driver   | Driver |
| driver2  | driver2  | Driver |

## API Endpoints

| Method | Endpoint                    | Auth     | Description               |
|--------|-----------------------------|----------|---------------------------|
| POST   | /api/auth/login             | No       | User login                |
| POST   | /api/auth/register          | Admin    | Register new user         |
| GET    | /api/auth/me                | Yes      | Get current user          |
| GET    | /api/vehicles               | Yes      | List vehicles             |
| POST   | /api/vehicles               | Admin    | Create vehicle            |
| PUT    | /api/vehicles/:id           | Admin    | Update vehicle            |
| DELETE | /api/vehicles/:id           | Admin    | Deactivate vehicle        |
| GET    | /api/mileage                | Yes      | List mileage logs         |
| POST   | /api/mileage                | Yes      | Log mileage entry         |
| GET    | /api/alerts                 | Yes      | List alerts               |
| PUT    | /api/alerts/:id/read        | Yes      | Mark alert as read        |
| PUT    | /api/alerts/read-all        | Yes      | Mark all alerts read      |
| GET    | /api/settings               | Yes      | Get app settings          |
| PUT    | /api/settings               | Admin    | Update settings           |
| GET    | /api/activity               | Yes      | Get activity log          |
| POST   | /api/import/vehicles        | Admin    | Import vehicle file       |
| POST   | /api/import/mileage         | Admin    | Import mileage file       |
| GET    | /api/reports/summary        | Admin    | Get fleet summary         |
| GET    | /api/reports/export/:type   | Admin    | Export report (CSV/JSON)  |

## Project Structure

```
vehicle-mileage-tracker/
├── server/                  # Backend
│   ├── index.js             # Express server
│   ├── config.js            # Configuration
│   ├── db/
│   │   ├── database.js      # SQLite schema
│   │   └── seed.js          # Database seeding
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   └── errorHandler.js  # Error handling
│   └── routes/              # API routes
├── public/                  # Frontend
│   ├── index.html           # SPA entry
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker
│   ├── css/                 # Stylesheets (themes, responsive)
│   └── js/                  # Application modules
├── package.json
├── .env.example
└── README.md
```

## License

MIT
