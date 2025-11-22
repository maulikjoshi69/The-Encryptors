// Global state
let authToken = null;
let currentUser = null;

// Initialize admin app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Authentication
function checkAuth() {
    authToken = localStorage.getItem('authToken');
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (!authToken || !currentUser || currentUser.role !== 'admin') {
        showAuthModal();
    } else {
        closeAuthModal();
        loadAdminData();
    }
}

function showAuthModal() {
    document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

async function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    try {
        const response = await fetch('http://localhost:8080/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok && data.user.role === 'admin') {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            closeAuthModal();
            loadAdminData();
        } else {
            alert('Admin access required or invalid credentials');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    showAuthModal();
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
    return response.json();
}

// Navigation
function showAdminSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    if (sectionId === 'appointments') loadAdminAppointments();
    if (sectionId === 'orders') loadAdminOrders();
    if (sectionId === 'reports') loadAdminReports();
    if (sectionId === 'emergencies') loadAdminEmergencies();
    if (sectionId === 'dashboard') loadAdminDashboard();
}

// Load Admin Data
async function loadAdminData() {
    await loadAdminDashboard();
}

async function loadAdminDashboard() {
    try {
        const [appointments, orders, reports, emergencies] = await Promise.all([
            apiCall('/api/appointments'),
            apiCall('/api/orders'),
            apiCall('/api/reports'),
            apiCall('/api/emergency').catch(() => [])
        ]);

        const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
        const activeEmergencies = emergencies.filter(e => e.status === 'active').length;

        document.getElementById('pendingAppointments').textContent = pendingAppointments;
        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('activeEmergencies').textContent = activeEmergencies;
        document.getElementById('totalReports').textContent = reports.length;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Appointments Management
async function loadAdminAppointments() {
    try {
        const appointments = await apiCall('/api/appointments');
        const list = document.getElementById('adminAppointmentsList');
        
        if (appointments.length === 0) {
            list.innerHTML = '<p>No appointments found.</p>';
            return;
        }

        list.innerHTML = appointments.map(apt => `
            <div class="appointment-item">
                <div class="item-content">
                    <h3>${apt.doctorName}</h3>
                    <p><strong>Patient ID:</strong> ${apt.userId}</p>
                    <p><strong>Type:</strong> ${apt.type}</p>
                    <p><strong>Date:</strong> ${new Date(apt.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${apt.time}</p>
                    ${apt.notes ? `<p>${apt.notes}</p>` : ''}
                    <span class="status-badge status-${apt.status}">${apt.status}</span>
                </div>
                <div class="item-actions">
                    ${apt.status === 'pending' ? `
                        <button class="btn-primary" onclick="updateAppointmentStatus('${apt.id}', 'confirmed')">Confirm</button>
                        <button class="btn-secondary" onclick="updateAppointmentStatus('${apt.id}', 'cancelled')">Cancel</button>
                    ` : ''}
                    ${apt.status === 'confirmed' ? `
                        <button class="btn-primary" onclick="updateAppointmentStatus('${apt.id}', 'completed')">Mark Complete</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

async function updateAppointmentStatus(id, status) {
    try {
        await apiCall(`/api/appointments/${id}`, 'PUT', { status });
        loadAdminAppointments();
        loadAdminDashboard();
    } catch (error) {
        alert('Error updating appointment: ' + error.message);
    }
}

// Orders Management
async function loadAdminOrders() {
    try {
        const orders = await apiCall('/api/orders');
        const list = document.getElementById('adminOrdersList');
        
        if (orders.length === 0) {
            list.innerHTML = '<p>No orders found.</p>';
            return;
        }

        list.innerHTML = orders.map(order => `
            <div class="order-item">
                <div class="item-content">
                    <h3>Order #${order.id.substring(0, 8)}</h3>
                    <p><strong>Patient ID:</strong> ${order.userId}</p>
                    <p><strong>Items:</strong> ${order.items.map(i => `${i.medicineName} x${i.quantity}`).join(', ')}</p>
                    <p><strong>Total:</strong> ₹${order.total}</p>
                    <p><strong>Address:</strong> ${order.address}</p>
                    <p><strong>Phone:</strong> ${order.phone}</p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </div>
                <div class="item-actions">
                    ${order.status === 'pending' ? `
                        <button class="btn-primary" onclick="updateOrderStatus('${order.id}', 'confirmed')">Confirm</button>
                        <button class="btn-secondary" onclick="updateOrderStatus('${order.id}', 'cancelled')">Cancel</button>
                    ` : ''}
                    ${order.status === 'confirmed' ? `
                        <button class="btn-primary" onclick="updateOrderStatus('${order.id}', 'shipped')">Mark Shipped</button>
                    ` : ''}
                    ${order.status === 'shipped' ? `
                        <button class="btn-primary" onclick="updateOrderStatus('${order.id}', 'delivered')">Mark Delivered</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function updateOrderStatus(id, status) {
    try {
        await apiCall(`/api/orders/${id}`, 'PUT', { status });
        loadAdminOrders();
        loadAdminDashboard();
    } catch (error) {
        alert('Error updating order: ' + error.message);
    }
}

// Reports Management
async function loadAdminReports() {
    try {
        const reports = await apiCall('/api/reports');
        const list = document.getElementById('adminReportsList');
        
        if (reports.length === 0) {
            list.innerHTML = '<p>No reports found.</p>';
            return;
        }

        list.innerHTML = reports.map(report => `
            <div class="report-item">
                <div class="item-content">
                    <h3>${report.title}</h3>
                    <p><strong>Patient ID:</strong> ${report.userId}</p>
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

// Emergencies Management
async function loadAdminEmergencies() {
    try {
        const emergencies = await apiCall('/api/emergencies');
        const list = document.getElementById('adminEmergenciesList');
        
        if (!emergencies || emergencies.length === 0) {
            list.innerHTML = '<p>No emergency requests found.</p>';
            return;
        }

        list.innerHTML = emergencies.map(emergency => `
            <div class="emergency-item">
                <div class="item-content">
                    <h3>🚨 ${emergency.type.toUpperCase()}</h3>
                    <p><strong>Patient ID:</strong> ${emergency.userId}</p>
                    <p><strong>Location:</strong> ${emergency.location}</p>
                    <p><strong>Phone:</strong> ${emergency.phone}</p>
                    <p><strong>Description:</strong> ${emergency.description}</p>
                    <p><strong>Time:</strong> ${new Date(emergency.createdAt).toLocaleString()}</p>
                    <span class="status-badge status-${emergency.status}">${emergency.status}</span>
                </div>
                <div class="item-actions">
                    ${emergency.status === 'active' ? `
                        <button class="btn-primary" onclick="updateEmergencyStatus('${emergency.id}', 'dispatched')">Mark Dispatched</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading emergencies:', error);
        document.getElementById('adminEmergenciesList').innerHTML = '<p>Error loading emergencies.</p>';
    }
}

async function updateEmergencyStatus(id, status) {
    try {
        await apiCall(`/api/emergencies/${id}`, 'PUT', { status });
        loadAdminEmergencies();
        loadAdminDashboard();
    } catch (error) {
        alert('Error updating emergency: ' + error.message);
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

