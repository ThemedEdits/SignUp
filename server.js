require('dotenv').config();
const express = require('express');
const { db } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here-make-it-long-and-complex',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
async function initializeDatabase(client) {
  try {
    // Create users table
    await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Check for admin user
    const { rows } = await client.sql`
      SELECT * FROM users WHERE is_admin = TRUE LIMIT 1
    `;

    if (rows.length === 0) {
      const adminPassword = await bcrypt.hash('admin123', 8);
      await client.sql`
        INSERT INTO users (username, email, password, is_admin)
        VALUES ('admin', 'admin@example.com', ${adminPassword}, TRUE)
      `;
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

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

// API Endpoints
app.post('/api/signup', async (req, res) => {
  let client;
  try {
    const { username, email, password } = req.body;
    
    // Validation
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

    client = await db.connect();
    const hashedPassword = await bcrypt.hash(password, 8);
    
    // Insert new user
    const { rows } = await client.sql`
      INSERT INTO users (username, email, password)
      VALUES (${username}, ${email}, ${hashedPassword})
      RETURNING id, is_admin
    `;

    const newUser = rows[0];
    req.session.userId = newUser.id;
    req.session.isAdmin = newUser.is_admin;
    
    return res.json({ 
      success: true, 
      userId: newUser.id,
      isAdmin: newUser.is_admin
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.message.includes('duplicate key')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/api/login', async (req, res) => {
  let client;
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    client = await db.connect();
    const { rows } = await client.sql`
      SELECT * FROM users WHERE username = ${username} LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    req.session.userId = user.id;
    req.session.isAdmin = user.is_admin;
    
    return res.json({ 
      success: true, 
      isAdmin: user.is_admin 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

app.get('/api/user', async (req, res) => {
  let client;
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    client = await db.connect();
    const { rows } = await client.sql`
      SELECT id, username, email, is_admin 
      FROM users 
      WHERE id = ${req.session.userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    return res.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    return res.status(500).json({ success: false, message: 'Database error' });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/admin/users', async (req, res) => {
  let client;
  try {
    if (!req.session.userId || !req.session.isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    client = await db.connect();
    const { rows } = await client.sql`
      SELECT id, username, email, is_admin 
      FROM users
    `;

    return res.json({ success: true, users: rows });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return res.status(500).json({ success: false, message: 'Database error' });
  } finally {
    if (client) client.release();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// Start server
async function startServer() {
  const client = await db.connect();
  try {
    await initializeDatabase(client);
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

startServer();