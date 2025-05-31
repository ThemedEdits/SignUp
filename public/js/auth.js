// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtn = document.getElementById('logoutBtn');

// Message display
function showMessage(message, isError = false) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = message;
  messageEl.className = isError ? 'message error' : 'message success';
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

// Login function
async function loginUser(username, password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      // Start page transition
      document.body.classList.add('loading');
      
      // Redirect after transition
      setTimeout(() => {
        window.location.href = data.isAdmin ? '/admin/dashboard' : '/dashboard';
      }, 300);
    } else {
      showMessage(data.message || 'Login failed', true);
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('An error occurred. Please try again.', true);
  }
}

// Signup function
async function registerUser(username, email, password) {
  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      showMessage('Registration successful! Redirecting...');
      
      // Start page transition
      document.body.classList.add('loading');
      
      // Redirect after transition
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } else {
      showMessage(data.message || 'Registration failed', true);
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('An error occurred. Please try again.', true);
  }
}

// Logout function
async function logoutUser() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      // Start page transition
      document.body.classList.add('loading');
      
      // Redirect after transition
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } else {
      showMessage('Logout failed. Please try again.', true);
    }
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('Logout failed. Please try again.', true);
  }
}

// Load user data for dashboard
async function loadUserData() {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update dashboard with user data
      document.getElementById('dashboard-username').textContent = data.user.username;
      document.getElementById('sidebar-username').textContent = data.user.username;
      document.getElementById('sidebar-email').textContent = data.user.email;
      
      if (data.user.avatar) {
        document.getElementById('sidebar-avatar').src = data.user.avatar;
      }
      
      // Show admin section if user is admin
      if (data.user.isAdmin) {
        document.getElementById('adminSection').style.display = 'block';
        loadAdminData();
      }
    } else {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    window.location.href = '/';
  }
}

// Event Listeners
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    loginUser(username, password);
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    registerUser(username, email, password);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', function(e) {
    e.preventDefault();
    logoutUser();
  });
}

// Password visibility toggle
document.querySelectorAll('.show-password').forEach(button => {
  button.addEventListener('click', function() {
    const input = this.parentElement.querySelector('input');
    const icon = this.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});

// Initialize dashboard if on dashboard page
if (document.querySelector('.dashboard-layout')) {
  loadUserData();
}