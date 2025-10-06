const Product = require('../models/Product');
const Category = require('../models/Category');
const genAI = require('../config/gemini');

const chatbotController = {
    handleMessage: async (req, res) => {
        try {
            const { message } = req.body;

            // Lấy dữ liệu sản phẩm và danh mục
            const [products, categories] = await Promise.all([
                Product.findAll(),
                Category.findAll()
            ]);

            // Format dữ liệu danh mục
            const categoriesData = categories.map(c => ({
                id: c.id,
                name: c.name,
                description: c.description
            }));

            // Format dữ liệu sản phẩm với thông tin danh mục
            const productsData = products.map(p => ({
                name: p.name,
                description: p.description,
                category: categoriesData.find(c => c.id === p.category_id),
                variants: p.variants.map(v => ({
                    color: v.color,
                    size: v.size,
                    price: v.price,
                    stock: v.stock,
                    images: [...new Set(v.images.map(img => img.image))]
                }))
            }));

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Cải thiện prompt với thông tin danh mục
            const prompt = `
            Context: 
            1. Danh mục sản phẩm:
            ${JSON.stringify(categoriesData, null, 2)}

            2. Thông tin chi tiết sản phẩm:
            ${JSON.stringify(productsData, null, 2)}
            
            Khi người dùng hỏi về sản phẩm hoặc danh mục, hãy:
            1. Nếu hỏi về danh mục: Liệt kê các sản phẩm trong danh mục đó
            2. Nếu hỏi về sản phẩm cụ thể:
               - Mô tả sản phẩm
               - Cho biết thuộc danh mục nào
               - Cung cấp giá và các biến thể có sẵn
               - Cung cấp links ảnh sản phẩm
            3. Trả lời ngắn gọn và chính xác
            4. Nếu không tìm thấy thông tin, thông báo "Xin lỗi, tôi không tìm thấy thông tin về điều bạn hỏi"

            Câu hỏi người dùng: ${message}
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;

            res.json({ response: response.text() });
        } catch (error) {
            console.error('Chatbot error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = chatbotController;