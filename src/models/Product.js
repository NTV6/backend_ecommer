const db = require('../config/database');

class Product {
    static async findAll() {
        // Lấy danh sách sản phẩm
        const [products] = await db.execute('SELECT * FROM products');

        // Lấy variants và images cho từng sản phẩm
        for (const product of products) {
            // Lấy variants
            const [variants] = await db.execute(
                'SELECT id, color, size, price, stock FROM product_variants WHERE product_id = ?',
                [product.id]
            );

            // Lấy images cho từng variant
            for (const variant of variants) {
                const [images] = await db.execute(
                    'SELECT id, image, image_public_id, is_thumbnail FROM product_variant_images WHERE variant_id = ?',
                    [variant.id]
                );
                variant.images = images;
            }

            product.variants = variants;
        }

        return products;
    }

    // Lấy sản phẩm theo ID
    static async findById(id) {
        // Lấy thông tin sản phẩm
        const [products] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);

        if (!products.length) return null;

        // Lấy variants của sản phẩm
        const [variants] = await db.execute(
            'SELECT * FROM product_variants WHERE product_id = ?',
            [id]
        );

        // Lấy hình ảnh cho mỗi variant
        for (const variant of variants) {
            const [images] = await db.execute(
                'SELECT * FROM product_variant_images WHERE variant_id = ?',
                [variant.id]
            );
            variant.images = images;
        }

        return {
            ...products[0],
            variants
        };
    }

    static async findByCategory(categoryId) {
        try {
            // Get all products in category
            const [products] = await db.execute(
                'SELECT * FROM products WHERE category_id = ?',
                [categoryId]
            );

            // Get variants and images for each product
            for (const product of products) {
                // Get variants
                const [variants] = await db.execute(
                    'SELECT id, color, size, price, stock FROM product_variants WHERE product_id = ?',
                    [product.id]
                );

                // Get images for each variant
                for (const variant of variants) {
                    const [images] = await db.execute(
                        'SELECT id, image, image_public_id, is_thumbnail FROM product_variant_images WHERE variant_id = ?',
                        [variant.id]
                    );
                    variant.images = images;
                }

                product.variants = variants;
            }

            return products;
        } catch (error) {
            console.error('Error in findByCategory:', error);
            throw error;
        }
    }

    static async #insertImages(conn, variantId, images) {
        const values = images.map(img => [
            variantId,
            img.image?.trim() || '',
            img.image_public_id?.trim() || '',
            img.is_thumbnail ? 1 : 0
        ]);

        await conn.query(
            'INSERT INTO product_variant_images (variant_id, image, image_public_id, is_thumbnail) VALUES ?',
            [values]
        );
    }

    static async create({ name, category_id, description, variants = [] }) {
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            const [productRes] = await conn.execute(
                'INSERT INTO products (name, category_id, description, created_at) VALUES (?, ?, ?, NOW())',
                [name.trim(), Number(category_id), description.trim()]
            );
            const productId = productRes.insertId;

            // 2. Insert variants and images
            for (const variant of variants) {
                const { color, size, price, stock, images = [] } = variant;

                if (!color || !size || price == null || stock == null) {
                    throw new Error('Thiếu thông tin biến thể');
                }

                const [variantRes] = await conn.execute(
                    'INSERT INTO product_variants (product_id, color, size, price, stock) VALUES (?, ?, ?, ?, ?)',
                    [productId, color.trim(), size.trim(), Number(price), Number(stock)]
                );
                const variantId = variantRes.insertId;

                if (images.length) {
                    await this.#insertImages(conn, variantId, images);
                }
            }

            await conn.commit();
            return await Product.findById(productId);
        } catch (err) {
            await conn.rollback();
            console.error('Lỗi khi tạo sản phẩm:', err.message);
            throw err;
        } finally {
            conn.release();
        }
    }

    static async update(id, { name, description, category_id, variants = [] }) {
        const conn = await db.getConnection();
        const oldImagePublicIds = [];

        try {
            await conn.beginTransaction();

            await conn.execute(
                'UPDATE products SET name = ?, description = ?, category_id = ?, updated_at = NOW() WHERE id = ?',
                [name?.trim(), description?.trim(), Number(category_id), id]
            );

            // 2. Xử lý biến thể (variants)
            const [currentVariants] = await conn.execute(
                'SELECT id FROM product_variants WHERE product_id = ?',
                [id]
            );
            const currentIds = currentVariants.map(v => v.id);
            const incomingIds = variants.filter(v => v.id).map(v => v.id);
            const toDeleteIds = currentIds.filter(variantId => !incomingIds.includes(variantId));

            // 2.1 Xóa các variant không còn trong danh sách mới
            for (const variantId of toDeleteIds) {
                const [images] = await conn.execute(
                    'SELECT variant_id, image_public_id FROM product_variant_images WHERE variant_id = ?',
                    [variantId]
                );

                oldImagePublicIds.push(...images.map(img => ({
                    variantId: img.variant_id,
                    publicId: img.image_public_id
                })).filter(img => img.publicId));

                await conn.execute('DELETE FROM product_variants WHERE id = ?', [variantId]);
            }

            // 2.2 Cập nhật hoặc thêm mới variants
            for (const variant of variants) {
                const { id: variantId, color, size, price, stock, images = [] } = variant;

                if (variantId) {
                    // Cập nhật variant cũ
                    await conn.execute(
                        'UPDATE product_variants SET color = ?, size = ?, price = ?, stock = ? WHERE id = ?',
                        [
                            String(color).trim(),
                            String(size).trim(),
                            Number(price),
                            Number(stock),
                            variantId
                        ]
                    );

                    // Xoá ảnh cũ
                    const [oldImgs] = await conn.execute(
                        'SELECT image_public_id FROM product_variant_images WHERE variant_id = ?',
                        [variantId]
                    );
                    oldImagePublicIds.push(...oldImgs.map(img => img.image_public_id).filter(Boolean));

                    await conn.execute(
                        'DELETE FROM product_variant_images WHERE variant_id = ?',
                        [variantId]
                    );
                } else {
                    // Thêm variant mới
                    const [res] = await conn.execute(
                        'INSERT INTO product_variants (product_id, color, size, price, stock) VALUES (?, ?, ?, ?, ?)',
                        [id, String(color).trim(), String(size).trim(), Number(price), Number(stock)]
                    );
                    variant.id = res.insertId;
                }

                // Thêm ảnh mới cho variant
                if (Array.isArray(images) && images.length > 0) {
                    const imageValues = images.map(img => [
                        variant.id,
                        String(img.image || ''),
                        String(img.image_public_id || ''),
                        Number(Boolean(img.is_thumbnail))
                    ]);

                    await conn.query(
                        'INSERT INTO product_variant_images (variant_id, image, image_public_id, is_thumbnail) VALUES ?',
                        [imageValues]
                    );
                }
            }

            // 3. Hoàn tất
            await conn.commit();

            const updatedProduct = await this.findById(id);
            updatedProduct.oldImagePublicIds = oldImagePublicIds;
            return updatedProduct;

        } catch (error) {
            await conn.rollback();
            console.error('Update error:', error);
            throw error;
        } finally {
            conn.release();
        }
    }


    static async delete(id) {
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            // 1. Lấy tất cả public_id của ảnh cần xóa
            const [images] = await conn.execute(`
                SELECT pvi.image_public_id 
                FROM product_variant_images pvi
                JOIN product_variants pv ON pvi.variant_id = pv.id
                WHERE pv.product_id = ?
            `, [id]);

            // 2. Xóa sản phẩm (cascade sẽ xóa variants và images trong DB)
            await conn.execute('DELETE FROM products WHERE id = ?', [id]);

            await conn.commit();

            // 3. Trả về danh sách public_id để controller xóa ảnh trên Cloudinary
            return images.map(img => img.image_public_id).filter(id => id);

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
}

module.exports = Product;