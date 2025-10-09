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
            Bạn là trợ lý mua sắm thông minh. Hãy phân tích câu hỏi và trả lời theo định dạng JSON.

            Context: 
            1. Danh mục sản phẩm:
            ${JSON.stringify(categoriesData, null, 2)}

            2. Thông tin chi tiết sản phẩm:
            ${JSON.stringify(productsData, null, 2)}
            
            Hãy trả về JSON với cấu trúc sau:
            {
                "type": "category_list" | "product_detail" | "product_list" | "general_response",
                "message": "Nội dung trả lời văn bản",
                "data": {
                    // Nếu type = "category_list":
                    "categories": [{ "id": 1, "name": "Tên danh mục", "productCount": 5 }]
                    
                    // Nếu type = "product_list":
                    "products": [{ 
                        "id": 1,
                        "name": "Tên sản phẩm",
                        "description": "Mô tả",
                        "category": "Tên danh mục",
                        "priceRange": { "min": 100000, "max": 200000 },
                        "image": "url_ảnh_đầu_tiên",
                        "inStock": true
                    }]
                    
                    // Nếu type = "product_detail":
                    "product": {
                        "id": 1,
                        "name": "Tên sản phẩm",
                        "description": "Mô tả",
                        "category": "Tên danh mục",
                        "variants": [{
                            "color": "Đỏ",
                            "size": "M",
                            "price": 150000,
                            "stock": 10,
                            "images": ["url1", "url2"]
                        }]
                    }
                }
            }

            Quy tắc:
            1. Nếu hỏi về danh mục → type = "category_list" hoặc "product_list"
            2. Nếu hỏi về sản phẩm cụ thể → type = "product_detail"
            3. Nếu câu hỏi chung (chào hỏi, hướng dẫn) → type = "general_response"
            4. Luôn trả về JSON hợp lệ
            5. message phải rõ ràng, thân thiện
            6. Nếu không tìm thấy, trả type = "general_response" với message thông báo

            Câu hỏi: ${message}
            
            Chỉ trả về JSON, không thêm text nào khác.
            `;

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