const Category = require('../models/Category');
const { deleteImage } = require('../utils/cloudinary'); // Đường dẫn đến tệp cấu hình Cloudinary

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();

        res.status(200).json({
            status: 'success',
            results: categories.length,
            data: { categories }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy danh mục với ID này'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { category }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const newCategory = await Category.create(req.body);

        res.status(201).json({
            status: 'success',
            data: { category: newCategory }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.update(req.params.id, req.body);

        res.status(200).json({
            status: 'success',
            data: { category }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Lấy public_id trước khi xóa sản phẩm
        const publicId = await Category.findPublicIdById(categoryId);

        if (publicId) {
            // Xóa ảnh từ Cloudinary
            await deleteImage(publicId);
        }

        await Category.delete(categoryId);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};