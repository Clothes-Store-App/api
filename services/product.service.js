const { Op } = require('sequelize');
const { Product, ProductColor, ProductSize, ColorSize } = require('../models');

const getAllProducts = async (search = '', category_id, order = 'DESC') => {
  const whereClause = {};

  if (search) {
    whereClause.name = {
      [Op.like]: `%${search}%`
    };
  }

  if (category_id) {
    whereClause.category_id = category_id;
  }

  // Kiểm tra order truyền vào có hợp lệ không
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const products = await Product.findAll({
    where: {
      status: true,
      ...whereClause
    },
    attributes: [
      'id',
      'name',
      'description',
      'price',
      'category_id'
    ],
    include: [
      {
        model: ProductColor,
        as: 'colors',
        attributes: [
          'id',
          'color_name',
          'color_code',
          'image'
        ],
        include: [
          {
            model: ColorSize,
            as: 'colorSizes',
            attributes: ['id'],
            include: [{
              model: ProductSize,
              as: 'size',
              attributes: [
                'id',
                'size_name'
              ]
            }]
          }
        ]
      }
    ],
    order: [['price', sortOrder]] // sắp xếp theo giá
  });

  const formattedProducts = products
    .filter(product => product.colors && product.colors.length > 0)
    .map(product => {
      const formattedColors = product.colors
        .filter(color => color.colorSizes && color.colorSizes.length > 0)
        .map(color => ({
          id: color.id,
          color_name: color.color_name,
          color_code: color.color_code,
          image: color.image,
          sizes: color.colorSizes.map(cs => ({
            id: cs.id,
            size_id: cs.size.id,
            size_name: cs.size.size_name
          }))
        }));

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category_id: product.category_id,
        colors: formattedColors
      };
    })
    .filter(product => product.colors.length > 0);

  return formattedProducts;
};

const getAllProductsByAdmin = async ({page = 1, limit = 10, search = '', category_id = null, status = null}) => {
  const offset = (page - 1) * limit;

  const whereClause = {};

  if (search) {
    whereClause.name = {
      [Op.like]: `%${search}%`
    };
  }

  if (category_id) {
    whereClause.category_id = category_id;
  }

  // Ép kiểu status từ string sang boolean nếu có
  if (status !== null) {
    if (status === 'true' || status === true) {
      whereClause.status = true;
    } else if (status === 'false' || status === false) {
      whereClause.status = false;
    }
  }

  // Đếm tổng số sản phẩm (tránh JOIN để không bị nhân bản)
  const count = await Product.count({
    where: whereClause,
    distinct: true,
    col: 'id'
  });

  // Lấy danh sách sản phẩm với mối quan hệ
  const rows = await Product.findAll({
    where: whereClause,
    include: [
      {
        model: ProductColor,
        as: 'colors',
        include: [
          {
            model: ColorSize,
            as: 'colorSizes',
            include: [{
              model: ProductSize,
              as: 'size'
            }]
          }
        ]
      }
    ],
    limit: limit,
    offset: offset,
    order: [['createdAt', 'DESC']]
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    itemsPerPage: limit,
    products: rows
  };
};


const getTopSellingProducts = async () => {
  return await Product.findAll({
    where: {
      status: true,
    },
    include: [
      {
        model: ProductColor,
        as: 'colors',
        include: [
          {
            model: ColorSize,
            as: 'colorSizes',
            include: [{
              model: ProductSize,
              as: 'size'
            }]
          }
        ]
      }
    ]
  });
};

const getProductById = async (id) => {
  return await Product.findByPk(id, {
    include: [
      {
        model: ProductColor,
        as: 'colors',
        include: [
          {
            model: ColorSize,
            as: 'colorSizes',
            include: [{
              model: ProductSize,
              as: 'size'
            }]
          }
        ]
      }
    ]
  });
};

const createProduct = async (productData) => {
  const { colors, files, ...productInfo } = productData;
  
  // Tạo sản phẩm
  const product = await Product.create(productInfo);

  // Upload và xử lý ảnh
  const uploadedImages = [];
  if (files && files.length > 0) {
    const { uploadToCloudinary } = require('../utils/cloudinary');
    
    for (const file of files) {
      try {
        const imageUrl = await uploadToCloudinary(file, 'products');
        uploadedImages.push(imageUrl);
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Tiếp tục với ảnh tiếp theo nếu có lỗi
        uploadedImages.push(null);
      }
    }
  }

  // Xử lý colors và sizes
  if (colors && Array.isArray(colors)) {
    for (let i = 0; i < colors.length; i++) {
      const colorData = colors[i];
      
      // Lấy ảnh tương ứng cho màu này (nếu có)
      const imageUrl = uploadedImages[i] || null;

      // Create color with image
      const productColor = await ProductColor.create({
        product_id: product.id,
        color_name: colorData.color_name,
        color_code: colorData.color_code,
        image: imageUrl
      });

      // Add sizes for this color
      if (colorData.sizes && colorData.sizes.length > 0) {
        const colorSizes = colorData.sizes.map(sizeId => ({
          product_id: product.id,
          product_color_id: productColor.id,
          product_size_id: parseInt(sizeId)
        }));
        await ColorSize.bulkCreate(colorSizes);
      }
    }
  }

  return await getProductById(product.id);
};

const updateProduct = async (id, productData) => {
  const { colors, files, ...productInfo } = productData;  
  // Cập nhật thông tin sản phẩm
  const product = await Product.findByPk(id);
  if (!product) throw new Error('Product not found');
  
  await product.update(productInfo);

  // Lấy thông tin màu sắc hiện tại
  const existingColors = await ProductColor.findAll({
    where: { product_id: id }
  });

  // Xử lý colors và sizes
  if (colors && Array.isArray(colors)) {    
    // Xóa các màu không còn trong danh sách mới
    const newColorIds = colors.map(c => c.id).filter(id => id); // Lọc ra các id không null
    await ProductColor.destroy({
      where: { 
        product_id: id,
        id: { [Op.notIn]: newColorIds }
      }
    });

    // Upload và xử lý ảnh mới (nếu có)
    const uploadedImages = [];
    if (files && files.length > 0) {      
      const { uploadToCloudinary } = require('../utils/cloudinary');
      
      for (const file of files) {
        try {
          const imageUrl = await uploadToCloudinary(file, 'products');
          uploadedImages.push(imageUrl);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          uploadedImages.push(null);
        }
      }
    }

    for (let i = 0; i < colors.length; i++) {
      const colorData = colors[i];
      let productColor;

      if (colorData.id) {
        // Cập nhật màu hiện có
        productColor = await ProductColor.findOne({
          where: { id: colorData.id, product_id: id }
        });

        if (productColor) {
          const updateData = {
            color_name: colorData.color_name,
            color_code: colorData.color_code,
          };

          // Chỉ cập nhật ảnh nếu có ảnh mới được upload
          if (files && files.length > 0 && uploadedImages[i]) {
            updateData.image = uploadedImages[i];
          } else if (colorData.image) {
            // Giữ lại ảnh cũ nếu có trong colorData và không có ảnh mới
            updateData.image = colorData.image;
          }

          await productColor.update(updateData);

          // Xóa sizes cũ của màu này
          await ColorSize.destroy({
            where: { product_color_id: productColor.id }
          });
        }
      } else {
        // Tạo màu mới        
        productColor = await ProductColor.create({
          product_id: id,
          color_name: colorData.color_name,
          color_code: colorData.color_code,
          // Sử dụng ảnh từ uploadedImages nếu có file mới, ngược lại sử dụng ảnh từ colorData
          image: (files && files.length > 0) ? (uploadedImages[i] || null) : (colorData.image || null)
        });
      }

      // Thêm sizes cho màu này
      if (colorData.sizes && colorData.sizes.length > 0 && productColor) {
        const colorSizes = colorData.sizes.map(sizeId => ({
          product_id: id,
          product_color_id: productColor.id,
          product_size_id: parseInt(sizeId)
        }));
        await ColorSize.bulkCreate(colorSizes);
      }
    }
  }

  return await getProductById(id);
};

const deleteProduct = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) throw new Error('Product not found');
  
  // ProductColor và ColorSize sẽ tự động bị xóa do có onDelete: 'CASCADE'
  return await product.update({ status: product.status ? false : true });
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsByAdmin,
  getTopSellingProducts
}; 