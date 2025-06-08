const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

router.post('/signup', userController.signup);
router.post('/login', userController.login);

router
    .route('/')
    .get(protect, restrictTo('admin'), userController.getAllUsers)

router
    .route('/profile')
    .get(protect, userController.getProfile);

router
    .route('/profile/image')
    .patch(protect, userController.updateImageProfile);

router
    .route('/profile/info')
    .patch(protect, userController.updateInfoProfile);

router
    .route('/:id')
    .delete(protect, restrictTo('admin'), userController.deleteUser);

router.patch('/:userId/role', protect, restrictTo('admin'), userController.updateUserRole);

module.exports = router;