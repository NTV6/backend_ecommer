const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const multer = require('multer');
const { protect } = require('../middlewares/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

router
    .route('/')
    .post(protect, upload.single('image'), uploadController.uploadImage)
    .delete(protect, uploadController.deleteUploadedFile);

module.exports = router;