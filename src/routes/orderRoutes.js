const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middlewares/auth');

router
    .route('/')
    .get(protect, restrictTo('admin'), orderController.getAllOrders)
    .post(protect, orderController.createOrder);

router
    .route('/:id')
    .get(protect, orderController.getOrder)
    .patch(protect, restrictTo('admin'), orderController.updateOrderStatus);

router
    .route('/user/:userId')
    .get(protect, orderController.getUserOrders);

module.exports = router;