const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll();

        res.status(200).json({
            status: 'success',
            results: products.length,
            data: { products }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy sản phẩm với ID này'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { product }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getProductsByCategory = async (req, res) => {
    try {
        const products = await Product.findByCategory(req.params.categoryId);

        res.status(200).json({
            status: 'success',
            results: products.length,
            data: { products }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const product = await Product.create(req.body);

        res.status(201).json({
            status: 'success',
            data: { product }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.update(req.params.id, req.body);

        res.status(200).json({
            status: 'success',
            data: { product }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy danh sách public_id cần xóa
        const imagePublicIds = await Product.delete(id);

        // Xóa ảnh trên Cloudinary
        for (const publicId of imagePublicIds) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Error deleting image from Cloudinary:', cloudinaryError);
            }
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};