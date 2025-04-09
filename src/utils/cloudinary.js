const cloudinary = require('../config/cloudinary'); // Đường dẫn đến tệp cấu hình Cloudinary

const deleteImage = async (publicId) => {
    try {
        if (!publicId) return null;
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Lỗi khi xóa ảnh từ Cloudinary:', error);
        throw error;
    }
};

module.exports = { deleteImage };