const cloudinary = require('../config/cloudinary');

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'No file uploaded'
            });
        }

        //Chuyển đổi bộ đệm thành base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Tải lên Cloudinary với tên tệp duy nhất
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'profiles',
            resource_type: 'auto',
            public_id: `profile_${Date.now()}`, // Thêm định danh duy nhất
            overwrite: true
        });

        res.status(200).json({
            status: 'success',
            data: {
                url: result.secure_url,
                public_id: result.public_id
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error uploading image'
        });
    }
};

exports.deleteUploadedFile = async (req, res) => {
    try {
        const { public_id } = req.body;

        if (!public_id) {
            return res.status(400).json({
                status: 'fail',
                message: 'Public ID is required'
            });
        }

        const result = await cloudinary.uploader.destroy(public_id);

        if (result.result !== 'ok') {
            throw new Error('Failed to delete image from Cloudinary');
        }

        res.status(200).json({
            status: 'success',
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete image'
        });
    }
};