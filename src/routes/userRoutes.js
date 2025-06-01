const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

router.post('/signup', userController.signup);
router.post('/login', userController.login);

router
    .route('/')
    .get(protect, restrictTo('admin'), userController.getAllUsers)
    .post(protect, restrictTo('admin'), userController.createUser);

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
    .get(protect, restrictTo('admin'), userController.getUser)
    .patch(protect, restrictTo('admin'), userController.updateUser)
    .delete(protect, restrictTo('admin'), userController.deleteUser);

module.exports = router;