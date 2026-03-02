const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

// Load environment variables first
dotenv.config();

const app = express();

const allowedOrigins = [
  "https://agrochain-teal.vercel.app",
  "https://agrochain-i1h0.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3001"
];

// Ensure logs directory exists
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const errorLogPath = path.join(__dirname, "logs", "error.log");
const accessLogPath = path.join(__dirname, "logs", "access.log");

const logStream = fs.createWriteStream(accessLogPath, { flags: "a" });

app.use(morgan("combined", { stream: logStream }));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log(`❌ Blocked by CORS: ${origin}`);
    return callback(new Error("CORS policy does not allow this origin."), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(helmet());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/farmer", require("./routes/farmer"));
app.use("/api/dealer", require("./routes/dealer"));
app.use("/api/retailer", require("./routes/retailer"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/representative", require("./routes/representative"));

// Health check route
app.get("/", (req, res) => {
  res.json({ 
    message: "AgroChain API is running", 
    version: "1.0.0",
    endpoints: {
      "POST /api/auth/send-otp": "Send email OTP",
      "POST /api/auth/verify-otp": "Verify email OTP", 
      "POST /api/auth/verify-google": "Verify Google token",
      "POST /api/auth/signup": "Regular signup with email OTP",
      "POST /api/auth/signup-google": "Signup with Google OAuth"
    }
  });
});

// ============================================
// CENTRAL ERROR-HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  // Prepare detailed error log entry
  const timestamp = new Date().toISOString();
  const logEntry = `
===============================================
[${timestamp}]
Method: ${req.method}
Path: ${req.originalUrl}
IP: ${req.ip || req.connection.remoteAddress}
User-Agent: ${req.get('user-agent') || 'N/A'}
Error Message: ${err.message}
===============================================
`;

  // Log to console for immediate visibility
  console.error("❌ Error occurred:", err.message);

  // Append to error.log file
  fs.appendFile(errorLogPath, logEntry, (writeErr) => {
    if (writeErr) {
      console.error("⚠️ Failed to write to error.log:", writeErr);
    } else {
      console.log("✅ Error logged to error.log");
    }
  });

  // Send response to client
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// 404 HANDLER (must be after error middleware)
// ============================================
app.use((req, res) => {
  const timestamp = new Date().toISOString();
  const notFoundLog = `
[${timestamp}] 404 Not Found
Method: ${req.method}
Path: ${req.originalUrl}
IP: ${req.ip || req.connection.remoteAddress}
-------------------------------------------
`;

  // Log 404 errors to error.log as well
  fs.appendFile(errorLogPath, notFoundLog, (err) => {
    if (err) console.error("Failed to log 404 error:", err);
  });

  res.status(404).json({
    success: false,
    msg: "API endpoint not found",
    path: req.path,
    method: req.method
  });
});

module.exports = app;