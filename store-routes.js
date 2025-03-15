// server/routes/stores.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// @route   GET api/stores
// @desc    Get all stores
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { name, address } = req.query;
    const userId = req.user.id;
    
    let query = `
      SELECT 
        s.id, 
        s.name, 
        s.email, 
        s.address, 
        s.owner_id,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as rating_count,
        (SELECT rating FROM ratings WHERE user_id = $1 AND store_id = s.id) as user_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      WHERE 1=1
    `;
    
    const params = [userId];
    
    // Add filters if provided
    if (name) {
      params.push(`%${name}%`);
      query += ` AND s.name ILIKE $${params.length}`;
    }
    
    if (address) {
      params.push(`%${address}%`);
      query += ` AND s.address ILIKE $${params.length}`;
    }
    
    query += ` GROUP BY s.id ORDER BY s.name`;
    
    const stores = await req.db.query(query, params);
    res.json(stores.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/stores/:id
// @desc    Get store by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const storeId = req.params.id;
    const userId = req.user.id;
    
    const storeResult = await req.db.query(
      `SELECT 
        s.id, 
        s.name, 
        s.email, 
        s.address, 
        s.owner_id,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as rating_count,
        (SELECT rating FROM ratings WHERE user_id = $1 AND store_id = s.id) as user_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      WHERE s.id = $2
      GROUP BY s.id`,
      [userId, storeId]
    );
    
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: true, message: 'Store not found' });
    }
    
    res.json(storeResult.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/stores
// @desc    Create a new store
// @access  Private (Admin only)
router.post(
  '/',
  [
    authMiddleware,
    roleCheck(['system_admin']),
    check('name', 'Name must be between 20 and 60 characters').isLength({ min: 20, max: 60 }),
    check('email', 'Please include a valid email').isEmail(),
    check('address', 'Address must not exceed 400 characters').isLength({ max: 400 }),
    check('owner_id', 'Owner ID is required').isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, address, owner_id } = req.body;

    try {
      // Check if store exists
      const storeExists = await req.db.query('SELECT * FROM stores WHERE email = $1', [email]);
      
      if (storeExists.rows.length > 0) {
        return res.status(400).json({ error: true, message: 'Store already exists' });
      }

      // Check if owner exists and is a store owner
      const ownerCheck = await req.db.query('SELECT * FROM users WHERE id = $1', [owner_id]);
      
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ error: true, message: 'Owner not found' });
      }

      // Update the user role to store_owner if not already
      if (ownerCheck.rows[0].role !== 'store_owner') {
        await req.db.query(
          'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
          ['store_owner', owner_id]
        );
      }

      // Create store
      const newStore = await req.db.query(
        'INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, address, owner_id',
        [name, email, address, owner_id]
      );

      res.status(201).json(newStore.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/stores/:id
// @desc    Update a store
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    roleCheck(['system_admin']),
    check('name', 'Name must be between 20 and 60 characters').isLength({ min: 20, max: 60 }),
    check('email', 'Please include a valid email').isEmail(),
    check('address', 'Address must not exceed 400 characters').isLength({ max: 400 }),
    check('owner_id', 'Owner ID is required').isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, address, owner_id } = req.body;
    const storeId = req.params.id;

    try {
      // Check if store exists
      const storeExists = await req.db.query('SELECT * FROM stores WHERE id = $1', [storeId]);
      
      if (storeExists.rows.length === 0) {
        return res.status(404).json({ error: true, message: 'Store not found' });
      }

      // Check if email is taken by another store
      const emailCheck = await req.db.query('SELECT * FROM stores WHERE email = $1 AND id != $2', [email, storeId]);
      
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: true, message: 'Email already in use by another store' });
      }

      // Check if owner exists and is a store owner
      const ownerCheck = await req.db.query('SELECT * FROM users WHERE id = $1', [owner_id]);
      
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ error: true, message: 'Owner not found' });
      }

      // Update the user role to store_owner if not already
      if (ownerCheck.rows[0].role !== 'store_owner') {
        await req.db.query(
          'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
          ['store_owner', owner_id]
        );
      }

      // If owner is changing, update previous owner's role if they don't own any other stores
      if (storeExists.rows[0].owner_id !== owner_id) {
        const oldOwnerId = storeExists.rows[0].owner_id;
        const otherStoresCount = await req.db.query(
          'SELECT COUNT(*) FROM stores WHERE owner_id = $1 AND id != $2',
          [oldOwnerId, storeId]
        );
        
        if (otherStoresCount.rows[0].count === '0') {
          await req.db.query(
            'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
            ['normal_user', oldOwnerId]
          );
        }
      }

      // Update store
      const updatedStore = await req.db.query(
        'UPDATE stores SET name = $1, email = $2, address = $3, owner_id = $4, updated_at = NOW() WHERE id = $5 RETURNING id, name, email, address, owner_id',
        [name, email, address, owner_id, storeId]
      );

      res.json(updatedStore.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/stores/:id
// @desc    Delete a store
// @access  Private (Admin only)
router.delete(
  '/:id',
  [authMiddleware, roleCheck(['system_admin'])],
  async (req, res) => {
    try {
      const storeId = req.params.id;
      
      // Check if store exists
      const storeExists = await req.db.query('SELECT * FROM stores WHERE id = $1', [storeId]);
      
      if (storeExists.rows.length === 0) {
        return res.status(404).json({ error: true, message: 'Store not found' });
      }

      // Get the owner ID before deleting
      const ownerId = storeExists.rows[0].owner_id;

      // Delete store
      await req.db.query('DELETE FROM stores WHERE id = $1', [storeId]);

      // Update owner's role if they don't own any other stores
      const otherStoresCount = await req.db.query(
        'SELECT COUNT(*) FROM stores WHERE owner_id = $1',
        [ownerId]
      );
      
      if (otherStoresCount.rows[0].count === '0') {
        await req.db.query(
          'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
          ['normal_user', ownerId]
        );
      }

      res.json({ success: true, message: 'Store deleted' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/stores/owner/dashboard
// @desc    Get store owner dashboard data
// @access  Private (Store Owner only)
router.get(
  '/owner/dashboard',
  [authMiddleware, roleCheck(['store_owner'])],
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      
      // Get store details
      const storeResult = await req.db.query(
        `SELECT 
          s.id, 
          s.name, 
          s.email, 
          s.address,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(r.id) as rating_count
        FROM stores s
        LEFT JOIN ratings r ON s.id = r.store_id
        WHERE s.owner_id = $1
        GROUP BY s.id`,
        [ownerId]
      );
      
      if (storeResult.rows.length === 0) {
        return res.status(404).json({ error: true, message: 'No store found for this owner' });
      }
      
      const store = storeResult.rows[0];
      
      // Get users who submitted ratings
      const usersWithRatings = await req.db.query(
        `SELECT 
          u.id, 
          u.name, 
          u.email, 
          r.rating, 
          r.created_at as rating_date
        FROM ratings r
        JOIN users u ON r.user_id = u.id
        WHERE r.store_id = $1
        ORDER BY r.created_at DESC`,
        [store.id]
      );
      
      res.json({
        store,
        users_with_ratings: usersWithRatings.rows
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
