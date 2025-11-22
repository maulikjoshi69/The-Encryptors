const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = 'medic_secret_key_change_in_production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const MEDICINES_FILE = path.join(DATA_DIR, 'medicines.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const EMERGENCIES_FILE = path.join(DATA_DIR, 'emergencies.json');

// Initialize data directory and files
async function initDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const files = [
      { path: USERS_FILE, default: [] },
      { path: RECORDS_FILE, default: [] },
      { path: APPOINTMENTS_FILE, default: [] },
      { path: MEDICINES_FILE, default: [
        { id: '1', name: 'Paracetamol 500mg', price: 50, stock: 100, pharmacy: 'MediCare Pharmacy' },
        { id: '2', name: 'Amoxicillin 250mg', price: 120, stock: 50, pharmacy: 'HealthPlus' },
        { id: '3', name: 'Ibuprofen 400mg', price: 80, stock: 75, pharmacy: 'City Pharmacy' },
        { id: '4', name: 'Aspirin 75mg', price: 40, stock: 200, pharmacy: 'MediCare Pharmacy' },
        { id: '5', name: 'Cetirizine 10mg', price: 60, stock: 90, pharmacy: 'HealthPlus' }
      ]},
      { path: ORDERS_FILE, default: [] },
      { path: REPORTS_FILE, default: [] },
      { path: EMERGENCIES_FILE, default: [] }
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch {
        await fs.writeFile(file.path, JSON.stringify(file.default, null, 2));
      }
    }

    // Create default admin account if it doesn't exist
    const users = await readJsonFile(USERS_FILE);
    const adminExists = users.find(u => u.email === 'admin@medic.com');
    
    if (!adminExists) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      const adminUser = {
        id: uuidv4(),
        email: 'admin@medic.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      users.push(adminUser);
      await writeJsonFile(USERS_FILE, users);
      console.log('✅ Default admin account created!');
      console.log('   Email: admin@medic.com');
      console.log('   Password: admin123');
    }
  } catch (error) {
    console.error('Error initializing data files:', error);
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Helper functions
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Validation helpers
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

function validatePhone(phone) {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
}

function validateDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

function validateTime(timeString) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

// Routes

// Authentication
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, role = 'patient' } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (name.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    if (role && !['patient', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be patient or admin' });
    }

    const users = await readJsonFile(USERS_FILE);

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: sanitizeInput(name),
      role: role || 'patient',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeJsonFile(USERS_FILE, users);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET);
    res.status(201).json({ 
      token, 
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role 
      },
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const users = await readJsonFile(USERS_FILE);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
});

// Health Records
app.get('/api/records', authenticateToken, async (req, res) => {
  try {
    const records = await readJsonFile(RECORDS_FILE);
    const userRecords = records.filter(r => r.userId === req.user.id);
    res.json(userRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/records', authenticateToken, async (req, res) => {
  try {
    const { title, description, date, type, doctor } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    if (title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters long' });
    }

    if (description.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters long' });
    }

    const validTypes = ['general', 'prescription', 'diagnosis', 'vaccination', 'surgery', 'test'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid record type' });
    }

    if (date && !validateDate(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const records = await readJsonFile(RECORDS_FILE);
    
    const newRecord = {
      id: uuidv4(),
      userId: req.user.id,
      title: sanitizeInput(title),
      description: sanitizeInput(description),
      date: date && validateDate(date) ? date : new Date().toISOString(),
      type: type && validTypes.includes(type) ? type : 'general',
      doctor: doctor ? sanitizeInput(doctor) : '',
      createdAt: new Date().toISOString()
    };

    records.push(newRecord);
    await writeJsonFile(RECORDS_FILE, records);
    res.status(201).json({ ...newRecord, message: 'Record added successfully' });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ error: 'Failed to add record. Please try again.' });
  }
});

app.delete('/api/records/:id', authenticateToken, async (req, res) => {
  try {
    const records = await readJsonFile(RECORDS_FILE);
    const filtered = records.filter(r => r.id !== req.params.id || r.userId !== req.user.id);
    await writeJsonFile(RECORDS_FILE, filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Appointments
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await readJsonFile(APPOINTMENTS_FILE);
    const userAppointments = appointments.filter(a => 
      req.user.role === 'admin' ? true : a.userId === req.user.id
    );
    res.json(userAppointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { doctorName, date, time, type, notes } = req.body;

    // Validation
    if (!doctorName || !date || !time) {
      return res.status(400).json({ error: 'Doctor name, date, and time are required' });
    }

    if (doctorName.length < 3) {
      return res.status(400).json({ error: 'Doctor name must be at least 3 characters long' });
    }

    if (!validateDate(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if date is in the past
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({ error: 'Appointment date cannot be in the past' });
    }

    if (!validateTime(time)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM format' });
    }

    const validTypes = ['consultation', 'lab_test', 'follow_up', 'surgery', 'checkup'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid appointment type' });
    }

    // Check for conflicting appointments
    const appointments = await readJsonFile(APPOINTMENTS_FILE);
    const conflictingAppointment = appointments.find(a => 
      a.userId === req.user.id && 
      a.date === date && 
      a.time === time && 
      a.status !== 'cancelled'
    );

    if (conflictingAppointment) {
      return res.status(400).json({ error: 'You already have an appointment at this date and time' });
    }
    
    const newAppointment = {
      id: uuidv4(),
      userId: req.user.id,
      doctorName: sanitizeInput(doctorName),
      date,
      time,
      type: type && validTypes.includes(type) ? type : 'consultation',
      status: 'pending',
      notes: notes ? sanitizeInput(notes) : '',
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    await writeJsonFile(APPOINTMENTS_FILE, appointments);
    res.status(201).json({ ...newAppointment, message: 'Appointment booked successfully' });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Failed to book appointment. Please try again.' });
  }
});

app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const appointments = await readJsonFile(APPOINTMENTS_FILE);
    const appointment = appointments.find(a => a.id === req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (req.user.role === 'admin' || appointment.userId === req.user.id) {
      appointment.status = status || appointment.status;
      await writeJsonFile(APPOINTMENTS_FILE, appointments);
      res.json(appointment);
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const orders = await readJsonFile(ORDERS_FILE);
    const order = orders.find(o => o.id === req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status || order.status;
    await writeJsonFile(ORDERS_FILE, orders);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/emergencies/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const emergencies = await readJsonFile(EMERGENCIES_FILE);
    const emergency = emergencies.find(e => e.id === req.params.id);
    
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    emergency.status = status || emergency.status;
    await writeJsonFile(EMERGENCIES_FILE, emergencies);
    res.json(emergency);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Medicines
app.get('/api/medicines', async (req, res) => {
  try {
    const medicines = await readJsonFile(MEDICINES_FILE);
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await readJsonFile(ORDERS_FILE);
    const userOrders = orders.filter(o => 
      req.user.role === 'admin' ? true : o.userId === req.user.id
    );
    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items, address, phone } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!address || address.length < 10) {
      return res.status(400).json({ error: 'Valid address is required (minimum 10 characters)' });
    }

    if (!phone || !validatePhone(phone)) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }

    const orders = await readJsonFile(ORDERS_FILE);
    const medicines = await readJsonFile(MEDICINES_FILE);
    
    let total = 0;
    const orderItems = [];
    const errors = [];

    for (const item of items) {
      if (!item.medicineId || !item.quantity) {
        errors.push('Each item must have medicineId and quantity');
        continue;
      }

      if (item.quantity < 1 || item.quantity > 100) {
        errors.push(`Invalid quantity for medicine ${item.medicineId}. Must be between 1 and 100`);
        continue;
      }

      const medicine = medicines.find(m => m.id === item.medicineId);
      if (!medicine) {
        errors.push(`Medicine with ID ${item.medicineId} not found`);
        continue;
      }

      if (medicine.stock < item.quantity) {
        errors.push(`Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`);
        continue;
      }

      total += medicine.price * item.quantity;
      orderItems.push({ 
        medicineId: item.medicineId,
        quantity: item.quantity,
        medicineName: medicine.name, 
        price: medicine.price 
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'No valid items in order' });
    }

    const newOrder = {
      id: uuidv4(),
      userId: req.user.id,
      items: orderItems,
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      address: sanitizeInput(address),
      phone: phone.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    await writeJsonFile(ORDERS_FILE, orders);
    res.status(201).json({ ...newOrder, message: 'Order placed successfully' });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
});

// Reports
app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    const reports = await readJsonFile(REPORTS_FILE);
    const userReports = reports.filter(r => 
      req.user.role === 'admin' ? true : r.userId === req.user.id
    );
    res.json(userReports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const { title, type, results, labName, date } = req.body;
    const reports = await readJsonFile(REPORTS_FILE);
    
    const newReport = {
      id: uuidv4(),
      userId: req.user.id,
      title,
      type: type || 'lab_test',
      results: results || '',
      labName: labName || '',
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    reports.push(newReport);
    await writeJsonFile(REPORTS_FILE, reports);
    res.json(newReport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Emergency Services
app.get('/api/emergencies', authenticateToken, async (req, res) => {
  try {
    const emergencies = await readJsonFile(EMERGENCIES_FILE);
    const userEmergencies = emergencies.filter(e => 
      req.user.role === 'admin' ? true : e.userId === req.user.id
    );
    res.json(userEmergencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/emergency', authenticateToken, async (req, res) => {
  try {
    const { type, location, description, phone } = req.body;

    // Validation
    if (!location || location.length < 5) {
      return res.status(400).json({ error: 'Valid location is required (minimum 5 characters)' });
    }

    if (!phone || !validatePhone(phone)) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }

    const validTypes = ['ambulance', 'medical_emergency', 'accident', 'fire', 'police'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid emergency type' });
    }

    const emergencies = await readJsonFile(EMERGENCIES_FILE);
    
    const newEmergency = {
      id: uuidv4(),
      userId: req.user.id,
      type: type && validTypes.includes(type) ? type : 'ambulance',
      location: sanitizeInput(location),
      description: description ? sanitizeInput(description) : '',
      phone: phone.trim(),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    emergencies.push(newEmergency);
    await writeJsonFile(EMERGENCIES_FILE, emergencies);
    
    // Simulate emergency response
    setTimeout(async () => {
      const updatedEmergencies = await readJsonFile(EMERGENCIES_FILE);
      const emergency = updatedEmergencies.find(e => e.id === newEmergency.id);
      if (emergency) {
        emergency.status = 'dispatched';
        await writeJsonFile(EMERGENCIES_FILE, updatedEmergencies);
      }
    }, 2000);

    res.status(201).json({ 
      ...newEmergency, 
      message: 'Emergency service has been notified. Help is on the way!' 
    });
  } catch (error) {
    console.error('Error requesting emergency:', error);
    res.status(500).json({ error: 'Failed to request emergency service. Please try again or call directly.' });
  }
});

// AI Symptom Checker
app.post('/api/ai/symptom-checker', authenticateToken, async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    
    // Simple AI-based symptom analysis (can be enhanced with ML models)
    const symptomKeywords = {
      fever: { conditions: ['Common Cold', 'Flu', 'Infection'], severity: 'moderate', advice: 'Rest, stay hydrated, monitor temperature' },
      headache: { conditions: ['Tension Headache', 'Migraine', 'Sinusitis'], severity: 'mild', advice: 'Rest in a dark room, stay hydrated' },
      cough: { conditions: ['Common Cold', 'Bronchitis', 'Allergy'], severity: 'mild', advice: 'Stay hydrated, avoid irritants' },
      chest_pain: { conditions: ['Heart Condition', 'Anxiety', 'Muscle Strain'], severity: 'high', advice: 'Seek immediate medical attention' },
      nausea: { conditions: ['Gastritis', 'Food Poisoning', 'Viral Infection'], severity: 'moderate', advice: 'Stay hydrated, avoid solid foods temporarily' }
    };

    const matchedConditions = [];
    const allAdvice = [];
    let maxSeverity = 'mild';

    symptoms.forEach(symptom => {
      const lowerSymptom = symptom.toLowerCase();
      for (const [key, value] of Object.entries(symptomKeywords)) {
        if (lowerSymptom.includes(key)) {
          matchedConditions.push(...value.conditions);
          allAdvice.push(value.advice);
          if (value.severity === 'high') maxSeverity = 'high';
          else if (value.severity === 'moderate' && maxSeverity === 'mild') maxSeverity = 'moderate';
        }
      }
    });

    const uniqueConditions = [...new Set(matchedConditions)];
    const recommendations = uniqueConditions.length > 0 
      ? uniqueConditions.slice(0, 3) 
      : ['General Consultation Recommended'];

    const aiResponse = {
      possibleConditions: recommendations,
      severity: maxSeverity,
      advice: allAdvice.length > 0 ? [...new Set(allAdvice)].join('. ') : 'Consult with a healthcare professional',
      recommendation: maxSeverity === 'high' 
        ? 'Seek immediate medical attention' 
        : maxSeverity === 'moderate' 
        ? 'Schedule an appointment with a doctor soon' 
        : 'Monitor symptoms and consult if they persist',
      timestamp: new Date().toISOString()
    };

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
initDataFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`Medic Healthcare Platform running on http://localhost:${PORT}`);
  });
});

