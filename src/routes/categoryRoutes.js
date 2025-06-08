const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middlewares/auth');

router
    .route('/')
    .get(categoryController.getAllCategories)
    .post(protect, restrictTo('admin'), categoryController.createCategory);

router
    .route('/:id')
    .patch(protect, restrictTo('admin'), categoryController.updateCategory)
    .delete(protect, restrictTo('admin'), categoryController.deleteCategory);

module.exports = router;