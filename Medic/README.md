# Medic - Unified Digital Healthcare Platform

A comprehensive healthcare platform that integrates health records, appointments, medicine ordering, emergency services, lab reports, and AI-powered health assistance.

## Features

### Core Functionalities
- **Centralized Health Records**: Securely store and manage all medical records
- **Appointment & Service Booking**: Book appointments with doctors and schedule lab tests
- **Medicine Ordering**: Order medicines from trusted pharmacies
- **Emergency Services Access**: Quick access to ambulance and emergency services
- **Online Report Delivery**: Receive and manage lab test reports online
- **AI Health Assistant**: AI-powered symptom checker and health recommendations

### User Interfaces
- **Patient Portal**: Complete user interface for accessing all healthcare services
- **Admin Dashboard**: Provider dashboard for managing appointments, orders, reports, and emergencies

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **Data Storage**: JSON files (can be easily migrated to database)

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`

3. **Access the Application**
   - **User Interface**: Open `http://localhost:3000` in your browser
   - **Admin Dashboard**: Open `http://localhost:3000/admin` in your browser

## Usage

### For Patients

1. **Register/Login**: Create an account or login with existing credentials
2. **Dashboard**: View overview of all your health data
3. **Health Records**: Add and manage your medical records
4. **Appointments**: Book appointments with doctors
5. **Medicines**: Browse and order medicines
6. **Reports**: Upload and view lab reports
7. **Emergency**: Request emergency services
8. **AI Assistant**: Get AI-powered health insights based on symptoms

### For Administrators

1. **Login**: Login with admin credentials (register with role 'admin')
2. **Dashboard**: View statistics and overview
3. **Manage Appointments**: Confirm, cancel, or mark appointments as complete
4. **Manage Orders**: Track and update medicine order status
5. **View Reports**: Access all patient reports
6. **Emergency Management**: Monitor and manage emergency requests

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Health Records
- `GET /api/records` - Get user's health records
- `POST /api/records` - Add new health record
- `DELETE /api/records/:id` - Delete health record

### Appointments
- `GET /api/appointments` - Get appointments
- `POST /api/appointments` - Book new appointment
- `PUT /api/appointments/:id` - Update appointment status

### Medicines & Orders
- `GET /api/medicines` - Get available medicines
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Place new order
- `PUT /api/orders/:id` - Update order status (admin)

### Reports
- `GET /api/reports` - Get lab reports
- `POST /api/reports` - Upload new report

### Emergency Services
- `GET /api/emergencies` - Get emergency requests
- `POST /api/emergency` - Request emergency service
- `PUT /api/emergencies/:id` - Update emergency status (admin)

### AI Assistant
- `POST /api/ai/symptom-checker` - Get AI-powered health analysis

## Project Structure

```
Medic/
├── server.js              # Express server and API routes
├── package.json           # Dependencies and scripts
├── data/                  # JSON data storage (auto-created)
│   ├── users.json
│   ├── records.json
│   ├── appointments.json
│   ├── medicines.json
│   ├── orders.json
│   ├── reports.json
│   └── emergencies.json
├── public/                # Frontend files
│   ├── index.html         # User interface
│   ├── admin.html         # Admin dashboard
│   ├── styles.css         # Styling
│   ├── app.js             # User interface logic
│   └── admin.js           # Admin dashboard logic
└── README.md              # This file
```

## AI Feature

The platform includes an AI-powered symptom checker that:
- Analyzes user symptoms
- Provides possible condition suggestions
- Assesses severity levels
- Offers health recommendations
- Suggests appropriate actions

## Security Notes

⚠️ **Important**: This is a demo/prototype application. For production use:
- Change the JWT_SECRET to a secure random string
- Implement proper database (PostgreSQL, MongoDB, etc.)
- Add input validation and sanitization
- Implement rate limiting
- Use HTTPS
- Add proper error handling
- Implement password strength requirements

## Future Enhancements

- Database integration (PostgreSQL/MongoDB)
- Real-time notifications
- Payment gateway integration
- Video consultation features
- Mobile app (React Native/Flutter)
- Advanced AI/ML models for health predictions
- Integration with medical devices
- Multi-language support

## License

This project is created for hackathon purposes.

## Support

For issues or questions, please check the code comments or create an issue in the repository.

