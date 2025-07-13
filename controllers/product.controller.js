const productService = require("../services/product.service");
const sendResponse = require("../utils/responseFormatter");
const { MESSAGE } = require("../constants/messages");
const { STATUS } = require("../constants/httpStatusCodes");
const { deleteFromCloudinary } = require("../utils/cloudinary");

const getAll = async (req, res) => {
  try {
    const search = req.query.search || '';
    const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;
    const order = req.query.order || 'DESC';
    const products = await productService.getAllProducts(search, category_id, order);
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
    const status = req.query.status || null;
    const result = await productService.getAllProductsByAdmin({page, limit, search, category_id, status});
    
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
    
    // Chuẩn bị dữ liệu cho service
    const productData = {
      name,
      description,
      price,
      category_id,
      colors: colorsData,
      files: req.files
    };

    const newProduct = await productService.createProduct(productData);
    sendResponse(res, STATUS.CREATED, MESSAGE.SUCCESS.CREATED, newProduct);
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

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, category_id, colors } = req.body;
    
    // Parse colors từ string JSON thành object
    const colorsData = JSON.parse(colors);
    
    // Chuẩn bị dữ liệu cho service
    const productData = {
      name,
      description,
      price,
      category_id,
      colors: colorsData,
      files: req.files
    };

    const updatedProduct = await productService.updateProduct(productId, productData);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.UPDATED, updatedProduct);
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

const remove = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);
    
    if (!product) {
      return sendResponse(res, STATUS.NOT_FOUND, MESSAGE.ERROR.NOT_FOUND);
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