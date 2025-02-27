const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');


// Register a new user
router.post('/register', authController.register);

// Login a user
router.post('/login', authController.login);

// Update user profile
router.put('/update-user', authMiddleware, authMiddleware, authController.updateUser);

// Reset user password
router.put('/reset-password', authMiddleware, authController.resetPassword);

// Update user password
router.put('/update-password', authMiddleware, authController.updatePassword);

// Delete user
router.delete('/delete-user', authMiddleware, authController.deleteUser);

// Get user by ID
router.get('/get-user/:userId', authMiddleware, authController.getUserById);

// Get all users
router.get('/all-users', authMiddleware, authController.getUsers);

//Verify Email
router.get('/verify-email/:token', authController.verifyEmail)

module.exports = router;