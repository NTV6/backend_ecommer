const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');

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

        // Lấy thông tin category trước khi xóa
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy danh mục'
            });
        }

        // Nếu có ảnh, xóa ảnh trên Cloudinary
        if (category.image_public_id) {
            try {
                await cloudinary.uploader.destroy(category.image_public_id);
            } catch (cloudinaryError) {
                console.error('Lỗi khi xóa ảnh từ Cloudinary:', cloudinaryError);
            }
        }

        // Xóa category trong database
        await Category.delete(categoryId);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};