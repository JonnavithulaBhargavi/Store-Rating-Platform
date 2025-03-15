// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// @route   GET api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', 
  [authMiddleware, roleCheck(['system_admin'])],
  async (req, res) => {
    try {
      const { name, email, role, address } = req.query;
      let query = 'SELECT id, name, email, address, role FROM users WHERE 1=1';
      const params = [];
      
      // Add filters if provided
      if (name) {
        params.push(`%${name}%`);
        query += ` AND name ILIKE $${params.length}`;
      }
      
      if (email) {
        params.push(`%${email}%`);
        query += ` AND email ILIKE $${params.length}`;
      }
      
      if (role) {
        params.push(role);
        query += ` AND role = $${params.length}`;
      }
      
      if (address) {
        params.push(`%${address}%`);
        query += ` AND address ILIKE $${params.length}`;
      }
      
      const users = await req.db.query(query, params);
      res.json(users.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/users/:id
// @desc    