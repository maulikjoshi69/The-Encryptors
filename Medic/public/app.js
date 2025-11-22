// Global state
let currentUser = null;
let authToken = null;
let cart = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadMedicines();
    updateDashboard();
});

// Authentication
function checkAuth() {
    authToken = localStorage.getItem('authToken');
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (!authToken || !currentUser) {
        showAuthModal();
    } else {
        closeAuthModal();
        loadUserData();
    }
}

function showAuthModal() {
    document.getElementById('authModal').classList.add('active');
    document.getElementById('authTitle').textContent = 'Login to Medic';
    document.getElementById('nameField').style.display = 'none';
    document.getElementById('authToggle').innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Register</a>';
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

let isRegisterMode = false;

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById('authTitle');
    const nameField = document.getElementById('nameField');
    const toggle = document.getElementById('authToggle');
    
    if (isRegisterMode) {
        title.textContent = 'Register for Medic';
        nameField.style.display = 'block';
        toggle.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>';
    } else {
        title.textContent = 'Login to Medic';
        nameField.style.display = 'none';
        toggle.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Register</a>';
    }
}

async function handleAuth(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Processing...';

    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;

    const endpoint = isRegisterMode ? '/api/register' : '/api/login';
    const body = isRegisterMode ? { email, password, name, role: 'patient' } : { email, password };

    try {
        const response = await fetch(`http://localhost:8080${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            closeAuthModal();
            showNotification('success', data.message || (isRegisterMode ? 'Registration successful!' : 'Login successful!'));
            loadUserData();
        } else {
            showNotification('error', data.error || 'Authentication failed');
        }
    } catch (error) {
        showNotification('error', 'Network error. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Notification system
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    showAuthModal();
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    if (sectionId === 'records') loadRecords();
    if (sectionId === 'appointments') loadAppointments();
    if (sectionId === 'reports') loadReports();
    if (sectionId === 'medicines') loadMedicines();
}

// API Helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };
    
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`http://localhost:8080${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
        const error = new Error(data.error || 'Request failed');
        error.status = response.status;
        throw error;
    }
    
    return data;
}

// Load User Data
async function loadUserData() {
    await Promise.all([
        loadRecords(),
        loadAppointments(),
        loadReports(),
        updateDashboard()
    ]);
}

async function updateDashboard() {
    try {
        const [records, appointments, orders, reports] = await Promise.all([
            apiCall('/api/records'),
            apiCall('/api/appointments'),
            apiCall('/api/orders'),
            apiCall('/api/reports')
        ]);

        document.getElementById('recordsCount').textContent = `${records.length} records`;
        document.getElementById('appointmentsCount').textContent = `${appointments.length} appointments`;
        document.getElementById('ordersCount').textContent = `${orders.length} orders`;
        document.getElementById('reportsCount').textContent = `${reports.length} reports`;
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Health Records
async function loadRecords() {
    try {
        const records = await apiCall('/api/records');
        const list = document.getElementById('recordsList');
        
        if (records.length === 0) {
            list.innerHTML = '<p>No health records found. Add your first record!</p>';
            return;
        }

        list.innerHTML = records.map(record => `
            <div class="record-item">
                <div class="item-content">
                    <h3>${record.title}</h3>
                    <p><strong>Type:</strong> ${record.type}</p>
                    <p><strong>Date:</strong> ${new Date(record.date).toLocaleDateString()}</p>
                    ${record.doctor ? `<p><strong>Doctor:</strong> ${record.doctor}</p>` : ''}
                    <p>${record.description}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-danger" onclick="deleteRecord('${record.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading records:', error);
    }
}

function showAddRecordModal() {
    document.getElementById('recordModal').classList.add('active');
    document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
}

function closeRecordModal() {
    document.getElementById('recordModal').classList.remove('active');
}

async function addRecord(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Saving...';

    try {
        const record = {
            title: document.getElementById('recordTitle').value,
            type: document.getElementById('recordType').value,
            date: document.getElementById('recordDate').value,
            doctor: document.getElementById('recordDoctor').value,
            description: document.getElementById('recordDescription').value
        };

        const response = await apiCall('/api/records', 'POST', record);
        closeRecordModal();
        showNotification('success', response.message || 'Record added successfully!');
        loadRecords();
        updateDashboard();
        event.target.reset();
    } catch (error) {
        showNotification('error', error.message || 'Failed to add record. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
        await apiCall(`/api/records/${id}`, 'DELETE');
        loadRecords();
        updateDashboard();
    } catch (error) {
        alert('Error deleting record: ' + error.message);
    }
}

// Appointments
async function loadAppointments() {
    try {
        const appointments = await apiCall('/api/appointments');
        const list = document.getElementById('appointmentsList');
        
        if (appointments.length === 0) {
            list.innerHTML = '<p>No appointments found. Book your first appointment!</p>';
            return;
        }

        list.innerHTML = appointments.map(apt => `
            <div class="appointment-item">
                <div class="item-content">
                    <h3>${apt.doctorName}</h3>
                    <p><strong>Type:</strong> ${apt.type}</p>
                    <p><strong>Date:</strong> ${new Date(apt.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${apt.time}</p>
                    ${apt.notes ? `<p>${apt.notes}</p>` : ''}
                    <span class="status-badge status-${apt.status}">${apt.status}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

function showAddAppointmentModal() {
    document.getElementById('appointmentModal').classList.add('active');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('appointmentDate').value = tomorrow.toISOString().split('T')[0];
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').classList.remove('active');
}

async function addAppointment(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Booking...';

    try {
        const appointment = {
            doctorName: document.getElementById('appointmentDoctor').value,
            type: document.getElementById('appointmentType').value,
            date: document.getElementById('appointmentDate').value,
            time: document.getElementById('appointmentTime').value,
            notes: document.getElementById('appointmentNotes').value
        };

        const response = await apiCall('/api/appointments', 'POST', appointment);
        closeAppointmentModal();
        showNotification('success', response.message || 'Appointment booked successfully!');
        loadAppointments();
        updateDashboard();
        event.target.reset();
    } catch (error) {
        showNotification('error', error.message || 'Failed to book appointment. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Medicines
async function loadMedicines() {
    try {
        const response = await fetch('http://localhost:8080/api/medicines');
        const medicines = await response.json();
        const list = document.getElementById('medicinesList');
        
        list.innerHTML = medicines.map(medicine => `
            <div class="medicine-card">
                <h3>${medicine.name}</h3>
                <div class="price">₹${medicine.price}</div>
                <div class="pharmacy">${medicine.pharmacy}</div>
                <div class="quantity-control">
                    <label>Quantity:</label>
                    <input type="number" id="qty-${medicine.id}" min="1" value="1" max="${medicine.stock}">
                    <button class="btn-primary" onclick="addToCart('${medicine.id}', '${medicine.name}', ${medicine.price})">Add to Cart</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading medicines:', error);
    }
}

function addToCart(medicineId, name, price) {
    const qtyInput = document.getElementById(`qty-${medicineId}`);
    const quantity = parseInt(qtyInput.value) || 1;
    
    const existingItem = cart.find(item => item.medicineId === medicineId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ medicineId, name, price, quantity });
    }
    
    updateCart();
    alert(`${name} added to cart!`);
}

function updateCart() {
    const cartSection = document.getElementById('cartSection');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartSection.style.display = 'none';
        return;
    }
    
    cartSection.style.display = 'block';
    let total = 0;
    
    cartItems.innerHTML = cart.map((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong>
                    <p>₹${item.price} x ${item.quantity}</p>
                </div>
                <div>
                    <strong>₹${itemTotal}</strong>
                    <button class="btn-danger" onclick="removeFromCart(${index})">Remove</button>
                </div>
            </div>
        `;
    }).join('');
    
    cartTotal.textContent = total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

async function checkout() {
    if (cart.length === 0) {
        showNotification('error', 'Your cart is empty!');
        return;
    }

    const address = prompt('Enter delivery address:');
    if (!address || address.length < 10) {
        showNotification('error', 'Please enter a valid address (minimum 10 characters)');
        return;
    }

    const phone = prompt('Enter contact number:');
    if (!phone) {
        showNotification('error', 'Phone number is required!');
        return;
    }

    try {
        const response = await apiCall('/api/orders', 'POST', {
            items: cart.map(item => ({ medicineId: item.medicineId, quantity: item.quantity })),
            address,
            phone
        });
        
        showNotification('success', response.message || 'Order placed successfully!');
        cart = [];
        updateCart();
        updateDashboard();
    } catch (error) {
        showNotification('error', error.message || 'Failed to place order. Please try again.');
    }
}

// Reports
async function loadReports() {
    try {
        const reports = await apiCall('/api/reports');
        const list = document.getElementById('reportsList');
        
        if (reports.length === 0) {
            list.innerHTML = '<p>No reports found. Upload your first report!</p>';
            return;
        }

        list.innerHTML = reports.map(report => `
            <div class="report-item">
                <div class="item-content">
                    <h3>${report.title}</h3>
                    <p><strong>Type:</strong> ${report.type}</p>
                    <p><strong>Lab:</strong> ${report.labName}</p>
                    <p><strong>Date:</strong> ${new Date(report.date).toLocaleDateString()}</p>
                    ${report.results ? `<p>${report.results}</p>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

function showAddReportModal() {
    document.getElementById('reportModal').classList.add('active');
    document.getElementById('reportDate').value = new Date().toISOString().split('T')[0];
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('active');
}

async function addReport(event) {
    event.preventDefault();
    try {
        const report = {
            title: document.getElementById('reportTitle').value,
            type: document.getElementById('reportType').value,
            labName: document.getElementById('reportLab').value,
            date: document.getElementById('reportDate').value,
            results: document.getElementById('reportResults').value
        };

        await apiCall('/api/reports', 'POST', report);
        closeReportModal();
        loadReports();
        updateDashboard();
        event.target.reset();
    } catch (error) {
        alert('Error adding report: ' + error.message);
    }
}

// Emergency
async function handleEmergency(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Sending Request...';

    try {
        const emergency = {
            type: document.getElementById('emergencyType').value,
            location: document.getElementById('emergencyLocation').value,
            phone: document.getElementById('emergencyPhone').value,
            description: document.getElementById('emergencyDescription').value
        };

        const result = await apiCall('/api/emergency', 'POST', emergency);
        showNotification('success', result.message || 'Emergency service has been notified! Help is on the way!');
        event.target.reset();
    } catch (error) {
        showNotification('error', error.message || 'Failed to request emergency service. Please call directly!');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// AI Assistant
async function handleAICheck(event) {
    event.preventDefault();
    try {
        const symptoms = document.getElementById('aiSymptoms').value.split(',').map(s => s.trim());
        const age = document.getElementById('aiAge').value;
        const gender = document.getElementById('aiGender').value;

        const result = await apiCall('/api/ai/symptom-checker', 'POST', { symptoms, age, gender });
        
        const resultsDiv = document.getElementById('aiResults');
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
            <h3>AI Analysis Results</h3>
            <p><strong>Possible Conditions:</strong></p>
            <div>
                ${result.possibleConditions.map(condition => 
                    `<span class="condition-tag">${condition}</span>`
                ).join('')}
            </div>
            <p style="margin-top: 1rem;"><strong>Severity:</strong> 
                <span class="severity-${result.severity}">${result.severity.toUpperCase()}</span>
            </p>
            <p style="margin-top: 1rem;"><strong>Advice:</strong> ${result.advice}</p>
            <p style="margin-top: 1rem;"><strong>Recommendation:</strong> ${result.recommendation}</p>
        `;
    } catch (error) {
        alert('Error analyzing symptoms: ' + error.message);
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
}

