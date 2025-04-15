const Product = require('../models/Product');
const { deleteImage } = require('../utils/cloudinary'); // Đường dẫn đến tệp cấu hình Cloudinary

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

exports.createProduct = async (req, res) => {
    try {
        const newProduct = await Product.create(req.body);

        res.status(201).json({
            status: 'success',
            data: { product: newProduct }
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
        const productId = req.params.id;

        // Lấy public_id trước khi xóa sản phẩm
        const publicId = await Product.findPublicIdById(productId);

        if (publicId) {
            // Xóa ảnh từ Cloudinary
            await deleteImage(publicId);
        }

        // Xóa sản phẩm từ database
        await Product.delete(productId);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        console.error('Lỗi khi xóa sản phẩm:', error);
        res.status(400).json({
            status: 'fail',
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