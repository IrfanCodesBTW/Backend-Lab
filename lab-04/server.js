const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Secret Key Constant (as per Lab 4 specs, kept as a constant before Lab 8 .env migration)
const SECRET_KEY = 'AURORA_BACKEND_SECRET_KEY_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Initialization
const dbPath = path.join(__dirname, 'database', 'userData.db');
let db = null;

const initializeDBAndServer = async () => {
  try {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create user table with unique username, name, and hashed password column
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        gender TEXT,
        location TEXT
      );
    `);

    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(` Lab 4 Server running on: http://localhost:${PORT}`);
      console.log(` Database connected: ${dbPath}`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error(`DB Initialization Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Root / Welcome Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    lab: 'Lab 4: Registration, login and JWT',
    course: 'Backend Development Fundamentals',
    institution: 'Aurora Deemed-to-be-University',
    faculty: 'Mr Yugandhar Gurjalwar',
    student: {
      name: 'Shaik Irfan Basha',
      registrationNumber: '252U1R1228',
      section: 'CSE-CORE-2E',
    },
    status: 'Server online and healthy',
    endpoints: {
      register: 'POST /register/ or POST /register',
      login: 'POST /login/ or POST /login',
      users: 'GET /users/ or GET /users (inspect password hashes in DB)',
      health: 'GET /api/health',
    },
  });
});

// User Registration Route
// POST /register/ or POST /register
const registerUserHandler = async (req, res) => {
  try {
    const { username, name, password, gender, location } = req.body;

    // Validate required fields
    if (!username || !password || !name) {
      return res.status(400).send('Username, name, and password are required');
    }

    // Optional password length validation
    if (password.length < 5) {
      return res.status(400).send('Password is too short');
    }

    // Check if user already exists using parameterized query
    const selectUserQuery = 'SELECT * FROM user WHERE username = ?;';
    const dbUser = await db.get(selectUserQuery, [username]);

    if (dbUser !== undefined) {
      return res.status(400).send('User already exists');
    }

    // Hash password with bcrypt (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user with hashed password
    const createUserQuery = `
      INSERT INTO user (username, name, password, gender, location)
      VALUES (?, ?, ?, ?, ?);
    `;
    await db.run(createUserQuery, [
      username,
      name,
      hashedPassword,
      gender || null,
      location || null,
    ]);

    return res.status(200).send('User created successfully');
  } catch (error) {
    console.error('Registration Error:', error.message);
    return res.status(500).send('Internal Server Error');
  }
};

app.post('/register', registerUserHandler);
app.post('/register/', registerUserHandler);

// User Login Route
// POST /login/ or POST /login
const loginUserHandler = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    // Query user by username using parameterized query
    const selectUserQuery = 'SELECT * FROM user WHERE username = ?;';
    const dbUser = await db.get(selectUserQuery, [username]);

    // Unknown user check -> return 400
    if (dbUser === undefined) {
      return res.status(400).send('Invalid user');
    }

    // Compare supplied password with stored hash
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    // Wrong password check -> return 400
    if (!isPasswordMatched) {
      return res.status(400).send('Invalid password');
    }

    // Put ONLY the username (never the password) in the JWT payload
    const payload = {
      username: username,
    };

    // Sign the token with secret key constant
    const jwt_token = jwt.sign(payload, SECRET_KEY);

    // Return { jwt_token } on success
    return res.status(200).send({ jwt_token });
  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).send('Internal Server Error');
  }
};

app.post('/login', loginUserHandler);
app.post('/login/', loginUserHandler);

// Database View Route (Inspect stored password hashes)
// GET /users/ or GET /users
const getUsersHandler = async (req, res) => {
  try {
    const getUsersQuery = 'SELECT id, username, name, password, gender, location FROM user;';
    const users = await db.all(getUsersQuery);
    return res.status(200).json(users);
  } catch (error) {
    console.error('Get Users Error:', error.message);
    return res.status(500).send('Internal Server Error');
  }
};

app.get('/users', getUsersHandler);
app.get('/users/', getUsersHandler);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).send('Route not found');
});

module.exports = app;
