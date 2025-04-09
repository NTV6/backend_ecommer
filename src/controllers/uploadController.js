const { deleteImage } = require('../utils/cloudinary');

exports.deleteUploadedFile = async (req, res) => {
    try {
        const { public_id } = req.body;
        if (!public_id) {
            return res.status(400).json({
                status: 'fail',
                message: 'Public ID is required'
            });
        }

        await deleteImage(public_id);

        res.status(200).json({
            status: 'success',
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};