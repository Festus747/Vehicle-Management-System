# Vehicle Mileage Tracking System

A web-based fleet management application with a VS Code-inspired user interface for monitoring vehicle usage and enforcing mileage limits.

## Features

- **Dashboard** - Real-time fleet overview with charts and statistics
- **Vehicle Management** - Register, edit, and deactivate vehicles
- **Mileage Tracking** - Log and track mileage with rollback prevention
- **Alert System** - Automatic warnings at 200 miles remaining, critical alerts at 5,000 miles
- **Reports** - Downloadable CSV and PDF reports
- **Role-Based Access** - Admin and Driver views
- **VS Code UI** - Activity bar, sidebar, tabs, and status bar

## Quick Start

1. Open `index.html` in a browser
2. Login with demo credentials:
   - **Admin**: username `admin`, password `admin`
   - **Driver**: username `driver`, password `driver`
3. Click "Load Sample Data" in Settings to populate test data

## Mileage Policy

- Maximum mileage per vehicle: **5,000 miles**
- Warning alert: Triggered at **4,800 miles** (200 remaining)
- Critical alert: Triggered at **5,000 miles** (limit exceeded)

## Technology

- Vanilla HTML/CSS/JavaScript
- Chart.js for data visualization
- LocalStorage for data persistence
- Font Awesome icons

## Project Structure

```
├── index.html          # Main application
├── css/
│   ├── style.css       # Core styles & VS Code theme
│   ├── dashboard.css   # Dashboard layout
│   ├── vehicles.css    # Vehicle panel styles
│   └── modals.css      # Modal dialogs
├── js/
│   ├── app.js          # Application entry point
│   ├── data.js         # Data layer (LocalStorage)
│   ├── auth.js         # Authentication module
│   ├── vehicles.js     # Vehicle management
│   ├── mileage.js      # Mileage tracking
│   ├── alerts.js       # Alerts & notifications
│   ├── reports.js      # Report generation
│   ├── dashboard.js    # Dashboard & charts
│   └── ui.js           # UI controller & navigation
└── README.md
```
