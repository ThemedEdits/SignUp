const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');


const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Add this right after your requires at the top
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Replace the database initialization with:
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to the database');
    
    // Create tables inside this callback to ensure DB is ready
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        is_admin INTEGER DEFAULT 0
      )`, (err) => {
      if (err) {
        console.error('Table creation error:', err);
      } else {
        console.log('Users table ready');
        
        // Check for admin user
        db.get("SELECT * FROM users WHERE is_admin = 1", [], (err, row) => {
          if (err) {
            console.error('Admin check error:', err);
          } else if (!row) {
            const adminUsername = 'admin';
            const adminEmail = 'admin@example.com';
            const adminPassword = bcrypt.hashSync('admin123', 8);
            
            db.run(
              "INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)",
              [adminUsername, adminEmail, adminPassword, 1],
              (err) => {
                if (err) {
                  console.error('Admin creation error:', err);
                } else {
                  console.log('Default admin user created');
                }
              }
            );
          }
        });
      }
    });
  }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: 'your-secret-key-here-make-it-long-and-complex',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});


// Serve static files from public directory
app.use(express.static('public'));
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    
    db.run(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ 
              success: false, 
              message: 'Username or email already exists' 
            });
          }
          return res.status(500).json({ 
            success: false, 
            message: 'Database error occurred' 
          });
        }

        req.session.userId = this.lastID;
        req.session.isAdmin = 0;
        
        return res.json({ 
          success: true, 
          userId: this.lastID,
          isAdmin: false
        });
      }
    );
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});


app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.isAdmin = user.is_admin;
    
    res.json({ 
      success: true, 
      isAdmin: user.is_admin 
    });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    
    res.clearCookie('connect.sid'); // This should match your session cookie name
    return res.json({ success: true });
  });
});

app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  
  db.get("SELECT id, username, email, is_admin FROM users WHERE id = ?", [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    });
  });
});

app.get('/api/admin/users', (req, res) => {
  if (!req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  db.all("SELECT id, username, email, is_admin FROM users", [], (err, users) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    res.json({ success: true, users });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }
  
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Password compare error:', err);
        return res.status(500).json({ success: false, message: 'Authentication error' });
      }
      
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      req.session.userId = user.id;
      req.session.isAdmin = user.is_admin;
      
      res.json({ 
        success: true, 
        isAdmin: user.is_admin 
      });
    });
  });
});

// Add error handling middleware (add this near the end, before app.listen):
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Access on your network at: http://${getIPAddress()}:${port}`);
});

// Add this function to get your local IP
function getIPAddress() {
  const interfaces = require('os').networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '0.0.0.0';
}

// start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});