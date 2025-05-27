const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');

router.post('/cod', protect, orderController.createCodOrder);
router.post('/vnpay', protect, orderController.createVnpayOrder);
router.get('/vnpay/callback', orderController.vnpayCallback);

module.exports = router;