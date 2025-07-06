const productService = require("../services/product.service");
const sendResponse = require("../utils/responseFormatter");
const { MESSAGE } = require("../constants/messages");
const { STATUS } = require("../constants/httpStatusCodes");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");
const { Product, ProductColor, Size, ColorSize, ProductSize } = require('../models');
const cloudinary = require('../utils/cloudinary');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, products);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const getAllByAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;

    const result = await productService.getAllProductsByAdmin(page, limit, search, category_id);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, result);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const getTopSelling = async (req, res) => {
  try {    
    const topSellingProducts = await productService.getTopSellingProducts();
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, topSellingProducts);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category_id, colors } = req.body;
    
    // Parse colors từ string JSON thành object
    const colorsData = JSON.parse(colors);
    
    // Create product
    const product = await Product.create({
      name,
      description,
      price,
      category_id
    });

    // Upload và xử lý ảnh
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
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

    // Process colors and their images
    if (colorsData && Array.isArray(colorsData)) {
      for (let i = 0; i < colorsData.length; i++) {
        const colorData = colorsData[i];
        
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

    // Fetch the complete product with its relations
    const completeProduct = await Product.findByPk(product.id, {
      include: [{
        model: ProductColor,
        as: 'colors',
        include: [{
          model: ProductSize,
          as: 'sizes',
          through: { attributes: [] }
        }]
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: completeProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi tạo sản phẩm', 
      error: error.message 
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;

    // Update product basic info
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.update({
      name,
      description,
      price
    });

    // Delete existing colors and their relationships
    await ProductColor.destroy({
      where: { product_id: id }
    });

    // Process colors and their images
    const colors = [];
    let colorIndex = 0;
    
    while (req.body[`colors[${colorIndex}][color_name]`] !== undefined) {
      const colorData = {
        color_name: req.body[`colors[${colorIndex}][color_name]`],
        color_code: req.body[`colors[${colorIndex}][color_code]`],
        sizes: JSON.parse(req.body[`colors[${colorIndex}][sizes]`] || '[]')
      };

      // Handle image upload for this color
      const colorImage = req.files[`colors[${colorIndex}][image]`];
      let imageUrl = req.body[`colors[${colorIndex}][existing_image]`]; // Keep existing image if provided
      
      if (colorImage && colorImage[0]) {
        // Upload to Cloudinary using buffer
        const result = await cloudinary.uploader.upload(
          `data:${colorImage[0].mimetype};base64,${colorImage[0].buffer.toString('base64')}`,
          {
            folder: 'products'
          }
        );
        imageUrl = result.secure_url;
      }

      // Create color with image
      const productColor = await ProductColor.create({
        product_id: product.id,
        color_name: colorData.color_name,
        color_code: colorData.color_code,
        image: imageUrl
      });

      // Add sizes for this color
      if (colorData.sizes.length > 0) {
        const colorSizes = colorData.sizes.map(size => ({
          color_id: productColor.id,
          size_id: size.id
        }));
        await ColorSize.bulkCreate(colorSizes);
      }

      colors.push(productColor);
      colorIndex++;
    }

    // Fetch the updated product with its relations
    const updatedProduct = await Product.findByPk(id, {
      include: [{
        model: ProductColor,
        include: [{
          model: Size,
          through: { attributes: [] }
        }]
      }]
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);
    
    if (!product) {
      return sendResponse(res, STATUS.NOT_FOUND, MESSAGE.ERROR.NOT_FOUND);
    }

    // Xóa tất cả ảnh của các màu sắc
    if (product.ProductColors) {
      for (const color of product.ProductColors) {
        if (color.image) {
          await deleteFromCloudinary(color.image);
        }
      }
    }
    
    await productService.deleteProduct(productId);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.DELETED);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const show = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);
    if (!product) {
      return sendResponse(res, STATUS.NOT_FOUND, MESSAGE.ERROR.NOT_FOUND);
    }
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, product);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const ApiProductController = {
  getAll,
  getAllByAdmin,
  createProduct,
  updateProduct,
  remove,
  show,
  getTopSelling
};

module.exports = ApiProductController; 