const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const cartController = require('../controllers/cartController');

router.use(protect);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.patch('/update', cartController.updateQuantity);
router.delete('/remove/:productId/:variantId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;