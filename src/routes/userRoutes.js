const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.get('/', protect, restrictTo('admin'), userController.getAllUsers)
router.get('/profile', protect, userController.getProfile);
router.patch('/profile/image', protect, userController.updateImageProfile);
router.patch('/profile/info', protect, userController.updateInfoProfile);
router.delete('/:id', protect, restrictTo('admin'), userController.deleteUser);
router.patch('/:userId/role', protect, restrictTo('admin'), userController.updateUserRole);

module.exports = router;