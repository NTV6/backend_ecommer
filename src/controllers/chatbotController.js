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
                id: p.id,
                name: p.name,
                description: p.description,
                category: categoriesData.find(c => c.id === p.category_id),
                image: p.variants[0]?.images[0]?.image || null,
                variants: p.variants.map(v => ({
                    color: v.color,
                    size: v.size,
                    price: v.price,
                    stock: v.stock,
                    images: [...new Set(v.images.map(img => img.image))]
                }))
            }));

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Cải thiện prompt để trả về JSON có cấu trúc
            const prompt = `
            Vai trò: Trợ lý mua sắm thông minh
            Input: ${message}

            Context (simplified):
            Categories: ${JSON.stringify(categoriesData.map(c => ({ id: c.id, name: c.name })))}
            Products: ${JSON.stringify(productsData.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category?.name,
                image: p.image,
                priceRange: {
                    min: Math.min(...p.variants.map(v => v.price)),
                    max: Math.max(...p.variants.map(v => v.price))
                },
                variants: p.variants.map(v => ({
                    color: v.color,
                    size: v.size,
                    price: v.price,
                    stock: v.stock,
                    images: v.images
                }))
            })))}

            Output format:
            {
                "type": "category_list" | "product_list" | "product_detail" | "general_response",
                "message": "Câu trả lời ngắn gọn",
                "showImages": boolean,
                "data": null | {
                    categories?: [{id, name, productCount}],
                    products?: [{
                        id, 
                        name, 
                        priceRange, 
                        category,
                        image,  // Đảm bảo trả về url hình ảnh
                        inStock
                    }],
                    product?: {
                        id, 
                        name,
                        image,  // Thêm thumbnail cho sản phẩm
                        variants: [{
                            color, 
                            size, 
                            price, 
                            stock,
                            images  // Đảm bảo trả về mảng url hình ảnh
                        }]
                    }
                }
            }

            Rules:
            1. Trả lời ngắn gọn, đúng trọng tâm
            2. showImages=true khi người dùng yêu cầu: xem ảnh/hình/photo/show/hiển thị
            3. Khi showImages=true, PHẢI trả về url hình trong data
            4. Luôn trả về JSON hợp lệ`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text().trim();

            // Xử lý response để đảm bảo là JSON hợp lệ
            // Loại bỏ markdown code block nếu có
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            try {
                const parsedResponse = JSON.parse(responseText);
                res.json(parsedResponse);
            } catch (parseError) {
                // Nếu không parse được JSON, trả về format mặc định
                console.error('JSON parse error:', parseError);
                res.json({
                    type: 'general_response',
                    message: responseText,
                    data: null
                });
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            res.status(500).json({
                type: 'error',
                message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
                data: null
            });
        }
    }
};

module.exports = chatbotController;