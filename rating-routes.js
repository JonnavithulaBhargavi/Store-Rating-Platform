// server/routes/ratings.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// @route   POST api/ratings
// @desc    Submit or update a rating
// @access  Private (Normal User only)
router.post(
  '/',
  [
    authMiddleware,
    roleCheck(['normal_user']),
    check('store_id', 'Store ID is required').isNumeric(),
    check('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { store_id, rating } = req.body;
    const userId = req.user.id;

    try {
      // Check if store exists
      const storeExists = await req.db.query('SELECT * FROM stores WHERE id = $1', [store_id]);
      
      if (storeExists.rows.length === 0) {
        return res.status(404).json({ error: true, message: 'Store not found' });
      }

      // Check if user has already rated this store
      const existingRating = await req.db.query(
        'SELECT * FROM ratings WHERE user_id = $1 AND store_id = $2',
        [userId, store_id]
      );
      
      let result;
      
      if (existingRating.rows.length > 0) {
        // Update existing rating
        result = await req.db.query(
          'UPDATE ratings SET rating = $1, updated_at = NOW() WHERE user_id = $2 AND store_id = $3 RETURNING id, user_id, store_id, rating',
          [rating, userId, store_id]
        );
      } else {
        // Create new rating
        result = await req.db.query(
          'INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3) RETURNING id, user_id, store_id, rating',
          [userId, store_id, rating]
        );
      }

      // Get the updated average rating
      const avgRating = await req.db.query(
        'SELECT COALESCE(AVG(rating), 0) as average_rating FROM ratings WHERE store_id = $1',
        [store_id]
      );

      res.status(201).json({
        rating: result.rows[0],
        average_rating: avgRating.rows[0].average_rating
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/ratings/:store_id
// @desc    Delete a rating
// @access  Private (Normal User only)
router.delete(
  '/:store_id',
  [
    authMiddleware,
    roleCheck(['normal_user'])
  ],
  async (req, res) => {
    try {
      const storeId = req.params.store_id;
      const userId = req.user.id;
      
      // Check if rating exists
      const ratingExists = await req.db.query(
        'SELECT * FROM ratings WHERE user_id = $1 AND store_id = $2',
        [userId, storeId]
      );
      
      if (ratingExists.rows.length === 0) {
        return res.status(404).json({ error: true, message: 'Rating not found' });
      }
      
      // Delete rating
      await req.db.query(
        'DELETE FROM ratings WHERE user_id = $1 AND store_id = $2',
        [userId, storeId]
      );
      
      // Get the updated average rating
      const avgRating = await req.db.query(
        'SELECT COALESCE(AVG(rating), 0) as average_rating FROM ratings WHERE store_id = $1',
        [storeId]
      );
      
      res.json({
        success: true,
        message: 'Rating deleted',
        average_rating: avgRating.rows[0].average_rating
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/ratings/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin only)
router.get(
  '/dashboard',
  [authMiddleware, roleCheck(['system_admin'])],
  async (req, res) => {
    try {
      // Get total counts
      const totalUsersResult = await req.db.query('SELECT COUNT(*) FROM users');
      const totalStoresResult = await req.db.query('SELECT COUNT(*) FROM stores');
      const totalRatingsResult = await req.db.query('SELECT COUNT(*) FROM ratings');
      
      // Get average rating across all stores
      const avgRatingResult = await req.db.query('SELECT COALESCE(AVG(rating), 0) as average_rating FROM ratings');
      
      // Get top rated stores
      const topStoresResult = await req.db.query(
        `SELECT 
          s.id, 
          s.name, 
          s.email, 
          s.address,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(r.id) as rating_count
        FROM stores s
        LEFT JOIN ratings r ON s.id = r.store_id
        GROUP BY s.id
        ORDER BY average_rating DESC, rating_count DESC
        LIMIT 5`
      );
      
      res.json({
        total_users: parseInt(totalUsersResult.rows[0].count),
        total_stores: parseInt(totalStoresResult.rows[0].count),
        total_ratings: parseInt(totalRatingsResult.rows[0].count),
        average_rating: avgRatingResult.rows[0].average_rating,
        top_stores: topStoresResult.rows
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
