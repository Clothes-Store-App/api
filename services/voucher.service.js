const db = require('../models');
const { Op } = require('sequelize');
const Voucher = db.Voucher;

async function createVoucher(data) {
  return await Voucher.create(data);
}

async function getAllVouchers() {
  return await Voucher.findAll();
}

async function getVoucherById(id) {
  return await Voucher.findByPk(id);
}

async function updateVoucher(id, data) {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw new Error('Voucher not found');
  return await voucher.update(data);
}

async function deleteVoucher(id) {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw new Error('Voucher not found');
  await voucher.destroy();
  return true;
}

// Logic áp dụng voucher miễn ship
async function applyVoucher(code) {
  const now = new Date();
  const voucher = await Voucher.findOne({
    where: {
      code,
      start_date: { [Op.lte]: now },
      end_date: { [Op.gte]: now },
      usage_limit: { [Op.gt]: db.sequelize.col('used_count') },
      is_free_shipping: true
    }
  });
  if (!voucher) throw new Error('Voucher không hợp lệ hoặc đã hết lượt dùng');
  // Tăng used_count
  await voucher.increment('used_count');
  return voucher;
}

async function getAvailableVouchers() {
  const now = new Date();
  return await Voucher.findAll({
    where: {
      start_date: { [Op.lte]: now },
      end_date: { [Op.gte]: now },
      usage_limit: { [Op.gt]: db.sequelize.col('used_count') }
    }
  });
}

module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  applyVoucher,
  getAvailableVouchers
}; 