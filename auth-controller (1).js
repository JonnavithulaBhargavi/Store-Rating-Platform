const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { validateEmail, validatePassword } = require('../utils/validators');

// JWT secret key - should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Login controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      }, 
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Remove password from user object
    delete user.password;

    // Set JWT as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return res.status(200).json({
      message: 'Login successful',
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Signup controller (for normal users only)
exports.signup = async (req, res) => {
  try {
    const { name, email, address, password } = req.body;

    // Validate inputs
    if (!name || !email || !address || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate name (20-60 characters)
    if (name.length < 20 || name.length > 60) {
      return res.status(400).json({ message: 'Name must be between 20 and 60 characters' });
    }

    // Validate address (max 400 characters)
    if (address.length > 400) {
      return res.status(400).json({ message: 'Address cannot exceed 400 characters' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password (8-16 chars, uppercase, special char)
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be 8-16 characters and include at least one uppercase letter and one special character' 
      });
    }

    // Check if email already exists
    const checkEmailQuery = 'SELECT * FROM users WHERE email = $1';
    const existingUser = await pool.query(checkEmailQuery, [email]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database (as normal user)
    const createUserQuery = `
      INSERT INTO users (name, email, address, password, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, address, role
    `;
    const newUser = await pool.query(createUserQuery, [name, email, address, hashedPassword, 'USER']);
    const user = newUser.rows[0];

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      }, 
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Set JWT as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get current user information
exports.getCurrentUser = async (req, res) => {
  try {
    // User is already authenticated through middleware
    const userId = req.userId;
    
    // Get user from database
    const userQuery = 'SELECT id, name, email, address, role FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get additional information if user is a store owner
    if (user.role === 'STORE_OWNER') {
      const storeQuery = 'SELECT id, name, address FROM stores WHERE owner_id = $1';
      const storeResult = await pool.query(storeQuery, [userId]);
      
      if (storeResult.rows.length > 0) {
        user.store = storeResult.rows[0];
        
        // Get average rating for the store
        const ratingQuery = 'SELECT AVG(rating) as average_rating FROM ratings WHERE store_id = $1';
        const ratingResult = await pool.query(ratingQuery, [user.store.id]);
        
        if (ratingResult.rows.length > 0) {
          user.store.average_rating = ratingResult.rows[0].average_rating;
        }
      }
    }
    
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Logout controller
exports.logout = (req, res) => {
  // Clear token cookie
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logged out successfully' });
};

// Update password controller
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Validate new password (8-16 chars, uppercase, special char)
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must be 8-16 characters and include at least one uppercase letter and one special character' 
      });
    }
    
    // Get user from database with password
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password in database
    const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2';
    await pool.query(updateQuery, [hashedPassword, userId]);
    
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
