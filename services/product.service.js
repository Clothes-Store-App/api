const { Op } = require('sequelize');
const { Product, ProductColor, ProductSize, ColorSize } = require('../models');

const getAllProducts = async () => {
  const products = await Product.findAll({
    where: {
      status: true // Chỉ lấy sản phẩm đang active
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
    order: [['createdAt', 'DESC']] // Sắp xếp sản phẩm mới nhất lên đầu
  });

  // Filter và format lại response
  const formattedProducts = products
    .filter(product => product.colors && product.colors.length > 0) // Chỉ lấy sản phẩm có màu sắc
    .map(product => {
      const formattedColors = product.colors
        .filter(color => color.colorSizes && color.colorSizes.length > 0) // Chỉ lấy màu có size
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
    .filter(product => product.colors.length > 0); // Chỉ lấy sản phẩm có ít nhất 1 màu có size

  return formattedProducts;
};

const getAllProductsByAdmin = async (page = 1, limit = 10, search = '', category_id = null) => {
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

  const { count, rows } = await Product.findAndCountAll({
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
  const { colors, ...productInfo } = productData;
  
  // Tạo sản phẩm
  const product = await Product.create(productInfo);

  // Nếu có thông tin về màu sắc
  if (colors && colors.length > 0) {
    for (const color of colors) {
      const { sizes, ...colorInfo } = color;
      
      // Tạo màu sắc cho sản phẩm
      const productColor = await ProductColor.create({
        ...colorInfo,
        product_id: product.id
      });

      // Nếu có thông tin về size
      if (sizes && sizes.length > 0) {
        for (const size of sizes) {
          await ColorSize.create({
            product_id: product.id,
            product_color_id: productColor.id,
            product_size_id: size.id
          });
        }
      }
    }
  }

  return await getProductById(product.id);
};

const updateProduct = async (id, productData) => {
  const { colors, ...productInfo } = productData;
  
  // Cập nhật thông tin sản phẩm
  const product = await Product.findByPk(id);
  if (!product) throw new Error('Product not found');
  
  await product.update(productInfo);

  // Nếu có cập nhật màu sắc
  if (colors && colors.length > 0) {
    // Xóa tất cả màu sắc và size cũ
    await ProductColor.destroy({
      where: { product_id: id }
    });

    // Thêm màu sắc và size mới
    for (const color of colors) {
      const { sizes, ...colorInfo } = color;
      
      const productColor = await ProductColor.create({
        ...colorInfo,
        product_id: id
      });

      if (sizes && sizes.length > 0) {
        for (const size of sizes) {
          await ColorSize.create({
            product_id: id,
            product_color_id: productColor.id,
            product_size_id: size.id
          });
        }
      }
    }
  }

  return await getProductById(id);
};

const deleteProduct = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) throw new Error('Product not found');
  
  // ProductColor và ColorSize sẽ tự động bị xóa do có onDelete: 'CASCADE'
  return await product.destroy();
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