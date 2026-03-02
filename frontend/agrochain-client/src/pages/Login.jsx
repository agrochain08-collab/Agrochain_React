// src/pages/Login.jsx - COMPLETE FILE WITH REDUX
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { GoogleLogin } from '@react-oauth/google';
import '../assets/css/login.css';

// 👇 ADD REDUX IMPORTS
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice';

// Import the new central Navbar
import Navbar from '../components/Navbar';

// Login Page component
const Login = () => {
  // 👇 ADD REDUX HOOKS
  const dispatch = useDispatch();
  const { loading: reduxLoading, error: reduxError } = useSelector((state) => state.auth);

  // Local state for form inputs and UI
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  // Timer logic from login.js
  useEffect(() => {
    let interval;
    if (showOtp && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
      setStatus('OTP expired. Please resend.');
    }
    return () => clearInterval(interval);
  }, [showOtp, timer]);

  // Redirect based on role — also checks if the user is a whitelisted representative
  const redirectToRolePage = async (user) => {
    // Admin shortcut (hardcoded admin email)
    if (user.email === "agrochain08@gmail.com") {
      navigate("/admin");
      return;
    }

    // Check if the email is a registered representative
    try {
      const repCheck = await api.get(`/admin/representatives/check/${encodeURIComponent(user.email)}`);
      if (repCheck.data.isRepresentative) {
        navigate("/representative");
        return;
      }
    } catch (err) {
      // If the check fails, fall through to normal role-based routing
      console.warn("Representative check failed, falling back to role routing:", err);
    }

    // Normal role-based routing
    if (user.role === 'farmer') {
      navigate('/farmer');
    } else if (user.role === 'dealer') {
      navigate('/dealer');
    } else if (user.role === 'retailer') {
      navigate('/retailer');
    }
  };

  // 👇 UPDATED: Google Login with Redux
  const handleGoogleLogin = async (credentialResponse) => {
    dispatch(loginStart()); // 👈 Redux action - start loading
    setLoading(true);
    setStatus('Verifying Google Sign-In...');
    
    try {
    const res = await api.post('/auth/login-google', { token: credentialResponse.credential });
    const { user, token } = res.data;
    
    // CRITICAL: Save to localStorage IMMEDIATELY before doing anything else
    localStorage.setItem("token", token);
    localStorage.setItem("agroChainUser", JSON.stringify(user));
    
    // Update Context and Redux
    login(user, token);
    dispatch(loginSuccess({ user, token })); 
    
    setStatus(`Welcome back, ${user.firstName}! Redirecting...`);
    
    // Small delay to ensure state propagates before navigation
    setTimeout(() => {
      redirectToRolePage(user);
    }, 100);
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Google login failed';
      
      // Update Redux with error
      dispatch(loginFailure(errorMsg)); // 👈 Redux action - failure
      setStatus(errorMsg);
    }
    setLoading(false);
  };

  // Send OTP (no Redux needed - temporary operation)
  const handleSendOtp = async (isResend = false) => {
    setLoading(true);
    setStatus('Sending OTP...');
    
    try {
      const response = await api.post('/auth/send-login-otp', { email });
      setStatus(response.data.msg);
      setShowOtp(true);
      setTimer(300); // Reset timer
    } catch (error) {
      setStatus(error.response?.data?.msg || 'Failed to send OTP');
    }
    setLoading(false);
  };

  // 👇 UPDATED: Verify OTP with Redux
  const handleVerifyOtp = async () => {
    dispatch(loginStart()); // 👈 Redux action - start loading
    setLoading(true);
    setStatus('Verifying OTP...');
    
    try {
      const res = await api.post('/auth/verify-login-otp', { email, otp });
      const { user, token } = res.data;

      // 1. First, update Redux
      dispatch(loginSuccess({ user, token }));

      // 2. Then, call context login to sync localStorage and state
      // This is CRITICAL for the api.jsx interceptor to work!
      login(user, token);

      setStatus(`Welcome back, ${user.firstName}! Redirecting...`);
      redirectToRolePage(user);
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Invalid OTP';
      
      // Update Redux with error
      dispatch(loginFailure(errorMsg)); // 👈 Redux action - failure
      setStatus(errorMsg);
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="signup-container">
        <h2>Login to AgroChain</h2>
        
        {/* Status message */}
        {status && 
          <div id="loginStatus" style={{
            display: 'block',
            padding: '12px',
            borderRadius: '4px',
            margin: '15px 0',
            color: status.includes('Failed') || status.includes('Error') || status.includes('expired') ? '#721c24' : '#155724',
            backgroundColor: status.includes('Failed') || status.includes('Error') || status.includes('expired') ? '#f8d7da' : '#d4edda'
          }}>
            {status}
          </div>
        }

        {/* Google Sign-In Section */}
        <div className="google-signin-section">
          <h4>Option 1: Sign in with Google</h4>
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => {
              console.log('Login Failed');
              setStatus('Google login failed. Please try again.');
            }}
            theme="outline"
            size="large"
            shape="rectangular"
            text="signin_with"
          />
        </div>
        
        <div className="divider"><span>OR</span></div>

        {/* Email + OTP Section */}
        <div className="email-otp-section">
          <h4>Option 2: Login with Email + OTP</h4>
          <input 
            type="email" 
            id="loginEmail" 
            placeholder="Enter your email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={showOtp || loading}
          />
          <button 
            type="button" 
            id="sendOtpBtn" 
            onClick={() => handleSendOtp(false)} 
            disabled={loading || showOtp}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>

          {showOtp && (
            <div id="otpSection">
              <label>Enter OTP</label>
              <input 
                type="text" 
                id="otpInput" 
                maxLength="6" 
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button" 
                id="verifyOtpBtn" 
                onClick={handleVerifyOtp} 
                disabled={loading || otp.length < 6}
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              
              <p className="otp-timer" id="otpTimer">
                {timer > 0 
                  ? `Code expires in ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}` 
                  : 'Code expired'}
              </p>
              
              {timer === 0 && (
                <button 
                  type="button" 
                  id="resendOtpBtn"
                  onClick={() => handleSendOtp(true)}
                  disabled={loading}
                >
                  Resend Code
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Sign Up Link */}
        <div className="new-user-card">
          <p>New to AgroChain?</p>
          <Link to="/signup" className="signup-btn">
            <i className="fa fa-user-plus"></i> Sign Up
          </Link>
        </div>
      </div>
    </>
  );
};

export default Login;