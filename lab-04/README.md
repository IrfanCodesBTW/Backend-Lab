# Lab 4: Registration, login and JWT

> **🔗 Live Deployment URL:** [https://backend-lab-lab-04.onrender.com](https://backend-lab-lab-04.onrender.com) *(or local server at `http://localhost:3000`)*

---

## 📋 Student & Curriculum Information

| Field | Details |
|---|---|
| **Student Name** | Shaik Irfan Basha |
| **Registration Number** | 252U1R1228 |
| **Section** | CSE-CORE-2E |
| **Course** | Backend Development Fundamentals · Year II Term II |
| **Faculty** | Joel Prashanth D |
| **Institution** | Aurora Deemed-to-be-University |
| **GitHub Repository** | [https://github.com/IrfanCodesBTW/Backend-Lab.git](https://github.com/IrfanCodesBTW/Backend-Lab.git) |
| **Repository Path** | `lab-04/` |

---

## 🎯 Objective

Implement secure user registration, authentication, and stateless authorization using cryptographic password hashing (`bcrypt`) and JSON Web Tokens (`jsonwebtoken`). The application securely manages credentials, protects against plain-text storage vulnerabilities, prevents duplicate registrations, validates input data, and produces tamper-proof JWT authentication tokens for verified users.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| **Node.js** | Server-side JavaScript runtime engine (v18+) |
| **Express.js** | Web routing framework and HTTP middleware handler |
| **SQLite (`sqlite` & `sqlite3`)** | Persistent relational database engine with promise-based API |
| **bcrypt** | Adaptive hashing algorithm for one-way password encryption with salt |
| **jsonwebtoken (JWT)** | Open standard (RFC 7519) for generating compact, digitally signed tokens |
| **Postman & REST Client** | Automated HTTP request suites for endpoint testing and verification |
| **jwt.io** | Official JWT debugger to inspect Header, Payload, and Signature components |

---

## ⚙️ How to Run

### 1. Install Dependencies
Navigate into the `lab-04` directory and install the required npm packages:
```bash
cd lab-04
npm install
```

### 2. Environment Variables
No `.env` file is required for this lab. As specified in the Lab 4 curriculum, the JWT secret key is held in a server constant (`AURORA_BACKEND_SECRET_KEY_2026`) and will be transitioned to an environment variable in Lab 8.

An optional port override can be configured:
```bash
# Optional: defaults to 3000 if not specified
PORT=3000
```

### 3. Start the Server
- **Development Mode (Nodemon with Auto-Reload):**
  ```bash
  npm run dev
  ```
- **Production / Standard Mode:**
  ```bash
  npm start
  ```

Server will run on: `http://localhost:3000`

---

## 🗄️ Database Architecture

**Database Location:** `database/userData.db`  
**Table:** `user`

```sql
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  gender TEXT,
  location TEXT
);
```

> [!IMPORTANT]
> - All SQL operations use **parameterized queries (`?`)** to prevent SQL injection attacks.
> - The `password` column strictly stores **one-way bcrypt hashes** (cost factor / salt rounds = 10). Plain-text passwords are never stored in the database or written to server logs.

---

## 📡 API Endpoints Table

| Method | Endpoint | Description | Status Codes | Request Body | Response Format |
|---|---|---|---|---|---|
| **GET** | `/` | API status, course details, and student information | `200 OK` | None | JSON object |
| **POST** | `/register/` | Register new user; checks for duplicates, hashes password with bcrypt | `200 OK`, `400 Bad Request`, `500 Internal Error` | `{ "username", "name", "password", "gender", "location" }` | Text (`"User created successfully"` or error message) |
| **POST** | `/login/` | Authenticate user; verifies password using `bcrypt.compare` and issues JWT | `200 OK`, `400 Bad Request`, `500 Internal Error` | `{ "username", "password" }` | JSON (`{ "jwt_token": "..." }`) or Text error message |
| **GET** | `/users/` | Audit route: inspect stored user records and confirm hashed passwords | `200 OK`, `500 Internal Error` | None | JSON array of user objects |
| **GET** | `/api/health` | Health check endpoint returning server uptime | `200 OK` | None | JSON object |

---

## 🔐 Implementation Details

### 1. User Registration (`POST /register/`)
- Parses request body via `app.use(express.json())`.
- Validates that `username`, `name`, and `password` are provided.
- Validates minimum password length (must be at least 5 characters).
- Executes parameterized query: `SELECT * FROM user WHERE username = ?;`
- If user exists, halts execution and responds with `400 Bad Request` (`"User already exists"`).
- Hashes plain-text password using `await bcrypt.hash(password, 10)`.
- Inserts new user record using parameterized statement `INSERT INTO user VALUES (?, ?, ?, ?, ?)`.
- Responds with `200 OK` (`"User created successfully"`).

### 2. User Authentication (`POST /login/`)
- Checks if username exists: `SELECT * FROM user WHERE username = ?;`
- If user does not exist, responds with `400 Bad Request` (`"Invalid user"`).
- Uses `await bcrypt.compare(password, dbUser.password)` to verify credential against stored hash.
- If password mismatch occurs, responds with `400 Bad Request` (`"Invalid password"`).
- If authenticated:
  - Generates token payload containing **only the username** (`{ username: dbUser.username }`).
  - Signs payload with `jwt.sign(payload, SECRET_KEY)`.
  - Responds with `200 OK` and payload: `{ "jwt_token": "<token_string>" }`.

---

## 🔍 JWT Token Inspection (jwt.io)

When decoded on [jwt.io](https://jwt.io), the issued token consists of three base64url-encoded components separated by dots (`.`):

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImlyZmFuIiwiaWF0IjoxNzk0NzYxNjM3fQ.l211kSXHpNE9JUqE1vFaup0NTLHEgYVDW0cQ0rHdiPo
```

### 1. Header (Algorithm & Token Type) - 🔴 Red
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```
*Identifies that HMAC SHA-256 is the cryptographic signing algorithm and JWT is the token format.*

### 2. Payload (Data Claims) - 🟣 Purple
```json
{
  "username": "irfan",
  "iat": 1794761637
}
```
*Stores public claims. It includes only the non-sensitive identity claim (`username`) and issued-at timestamp (`iat`). As mandated by security guidelines, credentials or passwords are **never** stored here.*

### 3. Signature - 🔵 Blue
```text
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  "AURORA_BACKEND_SECRET_KEY_2026"
)
```
*Ensures token integrity. Any modification to the payload will immediately invalidate the signature.*

---

## 📸 Screenshots Gallery

### 01. Server Start and Database Initialization
Server starts on port 3000, establishes connection to SQLite `userData.db`, and creates the `user` table:
![Server Start](screenshots/01-server-start-nodemon.png)

---

### 02. Successful User Registration (`POST /register/`)
Valid user registered with full payload; server returns `200 OK` and `"User created successfully"`:
![Registration Success](screenshots/02-post-register-success.png)

---

### 03. Duplicate User Registration Rejection (`POST /register/`)
Attempting to register the same username rejects with `400 Bad Request` and `"User already exists"`:
![Duplicate Registration Rejected](screenshots/03-post-register-duplicate-user-400.png)

---

### 04. Short Password Validation Rejection (`POST /register/`)
Attempting to register with password shorter than 5 characters returns `400 Bad Request` (`"Password is too short"`):
![Short Password Rejected](screenshots/04-post-register-short-password-400.png)

---

### 05. Database Audit - bcrypt Hashes Only (`GET /users/`)
Auditing database records demonstrates that passwords are strictly stored as `$2b$10$...` hashes:
![Database Verification](screenshots/05-database-bcrypt-hashes.png)

---

### 06. Login with Unknown Username (`POST /login/`)
Attempting to login with a non-existent user returns `400 Bad Request` and `"Invalid user"`:
![Unknown User Rejected](screenshots/06-post-login-invalid-user-400.png)

---

### 07. Login with Wrong Password (`POST /login/`)
Attempting to login with an incorrect password returns `400 Bad Request` and `"Invalid password"`:
![Wrong Password Rejected](screenshots/07-post-login-invalid-password-400.png)

---

### 08. Successful Login with Valid Credentials (`POST /login/`)
Authenticating with correct credentials generates a signed JWT token returning `{ "jwt_token": "..." }`:
![Login Success](screenshots/08-post-login-success-token.png)

---

### 09. JWT Token Verification on jwt.io
Decoding the token in jwt.io demonstrates clear separation of Header, Payload (username only), and Verified Signature:
![jwt.io Debugger](screenshots/09-jwt-io-token-decode.png)

---

## 🎓 Viva Voce Questions & Answers

| # | Question | Detailed Answer |
|---|---|---|
| **1** | **Why POST for login?** | Login requests submit sensitive credentials (username and password) to the server. If `GET` were used, credentials would be appended as query parameters in the URL (e.g. `/login?password=123`), causing them to be exposed in browser history, server access logs, web proxies, and intermediate networking hardware. Furthermore, `POST` is non-idempotent and delivers credentials in the encrypted HTTP request body (over TLS/HTTPS), keeping them private. |
| **2** | **Hash vs Encrypt?** | **Hashing** is a **one-way cryptographic function**: once data is converted into a hash, it cannot be reversed back to its original plain text. Passwords are saved as hashes (with random salt) so that even if the database is breached, attacker cannot derive original passwords. **Encryption** is a **two-way function**: data is scrambled using a cipher key and can be decrypted back to plain text using a corresponding decryption key. Encryption is used for transmitting confidential data, whereas passwords must always be hashed. |
| **3** | **What does `jwt.sign` need?** | `jwt.sign(payload, secretOrPrivateKey, [options])` requires: <br>1. **Payload**: A JavaScript object containing non-sensitive identity claims (e.g., `{ username: "irfan" }`).<br>2. **Secret / Private Key**: A secure secret string (for HMAC algorithms) or private key (for RSA/ECDSA) used to cryptographically sign the token.<br>3. **Options (optional)**: Configuration settings such as `expiresIn`, `algorithm` (default HS256), and `issuer`. |
| **4** | **What should never go into the payload?** | **Sensitive data such as plain-text passwords, password hashes, credit card numbers, social security numbers, or internal server secrets.** The payload of a JWT is only base64url-encoded and is completely readable by anyone who inspects the token. It is **not encrypted**, only signed against tampering. Therefore, only non-confidential identifiers (e.g., `userId`, `username`, `role`) belong in the payload. |

---

## ❗ Notes: Problems Faced and How They Were Solved

| # | Problem / Challenge | Root Cause | Solution |
|---|---|---|---|
| **1** | **`npm install` blocking native compilation scripts on Node 26** | Modern npm versions enforce strict script execution policies for binary packages (`bcrypt`, `sqlite3`). | Installed the latest prebuilt binaries for `bcrypt` and `sqlite3` on macOS ARM64 and verified that the CJS loader correctly initializes both modules before server execution. |
| **2** | **Duplicate Username Handling** | Repeated registration requests with identical usernames could cause uncaught SQLite `SQLITE_CONSTRAINT: UNIQUE constraint failed: user.username` crashes if unhandled. | Added an explicit check using `SELECT * FROM user WHERE username = ?` before insertion, returning an immediate, user-friendly `400 Bad Request` (`"User already exists"`). |
| **3** | **Password Exposure Risk in JWT** | Accidental inclusion of entire `dbUser` object into token payload would expose user hashes to the client. | Explicitly destructured and restricted the JWT payload to `{ username: dbUser.username }`, ensuring zero password leakage. |
| **4** | **Path Uniformity (`/register` vs `/register/`)** | Clients and automated grading suites occasionally toggle trailing slashes on endpoint URLs. | Mounted both route signatures `app.post('/register', handler)` and `app.post('/register/', handler)` to guarantee flawless compatibility across all clients. |

---

## 📜 Core Rules & Academic Integrity

- **Environment & Secrets:** `.env` and `node_modules/` are strictly excluded from version control via `.gitignore`.
- **Credential Safety:** Passwords are never stored, logged, or serialized in plain text.
- **HTTP Semantics:** Every route returns semantically accurate HTTP status codes (`200`, `400`, `404`, `500`).
- **Data Protection:** All database interactions utilize parameterized queries (`?`); dynamic SQL concatenation is strictly prevented.
- **Originality:** Code, configurations, and documentation are authored and maintained by the student.

---

## 👤 Author & Academic Attribution

**Shaik Irfan Basha**  
**Registration Number:** `252U1R1228`  
**Section:** `CSE-CORE-2E`  
**Department of Computer Science & Engineering**  
**Aurora Deemed-to-be-University**
