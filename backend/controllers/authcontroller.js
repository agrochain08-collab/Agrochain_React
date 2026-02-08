const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { OAuth2Client } = require('google-auth-library');
const jwt = require("jsonwebtoken");

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Create email transporter
const transport = nodemailer.createTransport({
  service: 'gmail', // or your preferred email service
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS  // Your app password
  }
});

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Send OTP for signup
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP with 5-minute expiry
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'AgroChain - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">Welcome to AgroChain!</h2>
          <p>Your email verification OTP is:</p>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #2e7d32; letter-spacing: 3px;">${otp}</span>
          </div>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">AgroChain - Connecting Agriculture Supply Chain</p>
        </div>
      `
    };

    await transport.sendMail(mailOptions);
    res.json({ msg: "OTP sent successfully to your email" });

  } catch (err) {
    next(err);
  }
};

// Send OTP for login
exports.sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Email not registered. Please signup first." });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP with 5-minute expiry
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'AgroChain - Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">AgroChain Login</h2>
          <p>Your login OTP is:</p>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #2e7d32; letter-spacing: 3px;">${otp}</span>
          </div>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">AgroChain - Connecting Agriculture Supply Chain</p>
        </div>
      `
    };

    await transport.sendMail(mailOptions);
    res.json({ msg: "Login OTP sent successfully to your email" });

  } catch (err) {
     next(err);
  }
};

// Verify OTP for signup
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ msg: "Email and OTP are required" });
    }

    const storedOTP = otpStore.get(email);
    
    if (!storedOTP) {
      return res.status(400).json({ msg: "OTP not found or expired" });
    }

    if (Date.now() > storedOTP.expires) {
      otpStore.delete(email);
      return res.status(400).json({ msg: "OTP has expired" });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    // OTP verified successfully
    otpStore.delete(email);
    res.json({ msg: "Email verified successfully" });

  } catch (err) {
     next(err);
  }
};

// Verify OTP for login
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ msg: "Email and OTP are required" });
    }

    const storedOTP = otpStore.get(email);
    
    if (!storedOTP) {
      return res.status(400).json({ msg: "OTP not found or expired" });
    }

    if (Date.now() > storedOTP.expires) {
      otpStore.delete(email);
      return res.status(400).json({ msg: "OTP has expired" });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    // Find user and return role for redirection
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // OTP verified successfully
    otpStore.delete(email);
    res.json({ 
      msg: "Login successful", 
      token,
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        role: user.role
      }
    });

  } catch (err) {
     next(err);
  }
};

// Verify Google token for signup
exports.verifyGoogleToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ msg: "Google token is required" });
    }

    // Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, given_name, family_name, email_verified } = payload;
    
    if (!email_verified) {
      return res.status(400).json({ msg: "Google email not verified" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    res.json({ 
      msg: "Google verification successful", 
      email,
      firstName: given_name,
      lastName: family_name || ''
    });

  } catch (err) {
    console.error('Google verification error:', err);
    res.status(400).json({ msg: "Invalid Google token" });
  }
};

// Verify Google token for login
exports.verifyGoogleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ msg: "Google token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ msg: "Google email not verified" });
    }

    // 🔹 Admin auto-register
    if (email === "agrochain08@gmail.com") {
      let adminUser = await User.findOne({ email });
      if (!adminUser) {
        adminUser = new User({
          role: "admin",
          firstName: given_name || "Admin",
          lastName: family_name || "",
          mobile: "0000000000",
          email,
          emailVerified: true,
          googleAuth: true,
        });
        await adminUser.save();
      }

      // ✅ FIXED: Changed 'user' to 'adminUser'
      const adminToken = jwt.sign(
        { id: adminUser._id, role: adminUser.role, email: adminUser.email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        msg: "Google login successful",
        token: adminToken,
        role: "admin",
        user: {
          id: adminUser._id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          role: "admin",
        },
      });
    }

    // 🔹 Regular users
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Email not registered. Please signup first." });
    }

    // ✅ FIXED: Added token generation for regular users
    const userToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      msg: "Google login successful",
      token: userToken,
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(400).json({ msg: "Invalid Google token" });
  }
};


// Regular signup with email OTP
exports.signup = async (req, res) => {
  try {
    const { role, firstName, mobile, email, emailVerified } = req.body;

    if (!role || !firstName || !mobile || !email) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    if (!emailVerified) {
      return res.status(400).json({ msg: "Please verify your email first" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // Role-specific validations
    if (role === "farmer") {
      if (!req.body.aadhaar || req.body.aadhaar.length !== 12) {
        return res.status(400).json({ msg: "Farmer Aadhaar must be 12 digits" });
      }
    }

    if (role === "dealer") {
      if (!req.body.gstin) {
        return res.status(400).json({ msg: "Dealer GSTIN is required" });
      }
      if (req.body.mobile.length !== 10) {
        return res.status(400).json({ msg: "Dealer mobile must be 10 digits" });
      }
    }

    if (role === "retailer") {
      if (!req.body.shopName) {
        return res.status(400).json({ msg: "Retailer shop name required" });
      }
      if (req.body.mobile.length !== 10) {
        return res.status(400).json({ msg: "Retailer mobile must be 10 digits" });
      }
    }

    const userData = { ...req.body };
    userData.emailVerified = true;
    delete userData.emailVerified; // Remove verification flag before saving

    const user = new User(userData);
    await user.save();
    res.status(201).json({ msg: "User registered successfully", user });

  } catch (err) {
     next(err);
  }
};

// Signup with Google verification
exports.signupWithGoogle = async (req, res) => {
  try {
    const { role, googleToken, ...otherData } = req.body;

    if (!role || !googleToken) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // Verify Google token again for security
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // Role-specific validations
    if (role === "farmer") {
      if (!otherData.aadhaar || otherData.aadhaar.length !== 12) {
        return res.status(400).json({ msg: "Farmer Aadhaar must be 12 digits" });
      }
    }

    if (role === "dealer") {
      if (!otherData.gstin) {
        return res.status(400).json({ msg: "Dealer GSTIN is required" });
      }
      if (otherData.mobile && otherData.mobile.length !== 10) {
        return res.status(400).json({ msg: "Dealer mobile must be 10 digits" });
      }
    }

    if (role === "retailer") {
      if (!otherData.shopName) {
        return res.status(400).json({ msg: "Retailer shop name required" });
      }
      if (otherData.mobile && otherData.mobile.length !== 10) {
        return res.status(400).json({ msg: "Retailer mobile must be 10 digits" });
      }
    }

    const userData = {
      ...otherData,
      email,
      firstName: given_name,
      lastName: family_name || otherData.lastName || '',
      role,
      emailVerified: true,
      googleAuth: true
    };

    const user = new User(userData);
    await user.save();
    res.status(201).json({ msg: "User registered successfully with Google", user });

  } catch (err) {
    next(err);
  }
};

exports.updateFarmerProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;

    const user = await User.findOneAndUpdate({ email }, updates, { new: true });
    if (!user) return res.status(404).json({ msg: "Farmer not found" });

    res.json({ msg: "Profile updated successfully", user });
  } catch (err) {
     next(err);
  }
};