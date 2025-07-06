const { ProductSize } = require('../models');

const getAllSizes = async () => {
  return await ProductSize.findAll();
};

const getSizeById = async (id) => {
  return await ProductSize.findByPk(id);
};

const createSize = async (sizeData) => {
  return await ProductSize.create(sizeData);
};

const updateSize = async (id, sizeData) => {
  const size = await ProductSize.findByPk(id);
  if (!size) throw new Error('Size not found');
  
  return await size.update(sizeData);
};

const deleteSize = async (id) => {
  const size = await ProductSize.findByPk(id);
  if (!size) throw new Error('Size not found');
  
  return await size.destroy();
};

module.exports = {
  getAllSizes,
  getSizeById,
  createSize,
  updateSize,
  deleteSize
}; 