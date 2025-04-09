const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect, restrictTo } = require('../middlewares/auth');

router
    .route('/')
    .delete(protect, restrictTo('admin'), uploadController.deleteUploadedFile);

module.exports = router;