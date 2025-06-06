const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middlewares/auth');

router.post('/cod', protect, orderController.createCodOrder);
router.post('/vnpay', protect, orderController.createVnpayOrder);
router.get('/vnpay/callback', orderController.vnpayCallback);

// Các routes cho admin
router.get('/all', protect, restrictTo('admin'), orderController.getAllOrders);
router.get('/:orderId', protect, orderController.getOrderDetails);
router.patch('/:orderId/status', protect, restrictTo('admin'), orderController.updateOrderStatus);

module.exports = router;