const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.get('/profile', protect, userController.getProfile);

router
    .route('/')
    .get(protect, restrictTo('admin'), userController.getAllUsers)
    .post(protect, restrictTo('admin'), userController.createUser);

router
    .route('/:id')
    .get(protect, restrictTo('admin'), userController.getUser)
    .patch(protect, restrictTo('admin'), userController.updateUser)
    .delete(protect, restrictTo('admin'), userController.deleteUser);

module.exports = router;