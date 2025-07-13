const { Rating, User, Product, ProductColor } = require('../models');
const { Op } = require('sequelize');

const createRating = async (ratingData) => {
  try {
    const { user_id, product_id, star, text } = ratingData;
    
    // Kiểm tra xem user đã rating sản phẩm này chưa
    const existingRating = await Rating.findOne({
      where: {
        user_id,
        product_id
      }
    });
    
    if (existingRating) {
      throw new Error('Bạn đã đánh giá sản phẩm này rồi');
    }
    
    // Tạo rating mới
    const rating = await Rating.create({
      user_id,
      product_id,
      star,
      text
    });
    
    // Lấy rating với thông tin user
    const newRating = await Rating.findByPk(rating.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name']
        }
      ]
    });
    
    return newRating;
  } catch (error) {
    throw error;
  }
};

const updateRating = async (ratingId, ratingData, userId) => {
  try {
    const rating = await Rating.findByPk(ratingId);
    
    if (!rating) {
      throw new Error('Đánh giá không tồn tại');
    }
    
    // Kiểm tra quyền sở hữu
    if (rating.user_id !== userId) {
      throw new Error('Bạn không có quyền cập nhật đánh giá này');
    }
    
    await rating.update(ratingData);
    
    // Lấy rating đã cập nhật với thông tin user
    const updatedRating = await Rating.findByPk(ratingId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name']
        }
      ]
    });
    
    return updatedRating;
  } catch (error) {
    throw error;
  }
};

const deleteRating = async (ratingId, userId) => {
  try {
    const rating = await Rating.findByPk(ratingId);
    
    if (!rating) {
      throw new Error('Đánh giá không tồn tại');
    }
    
    // Kiểm tra quyền sở hữu
    if (rating.user_id !== userId) {
      throw new Error('Bạn không có quyền xóa đánh giá này');
    }
    
    await rating.destroy();
    return true;
  } catch (error) {
    throw error;
  }
};

const getRatingsByProduct = async (productId) => {
  try {
    
    const ratings = await Rating.findAll({
      where: {
        product_id: productId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'image']
        }
      ],
      order: [['createdAt', 'DESC']],
    });
    
    return ratings;
  } catch (error) {
    throw error;
  }
};

const getRatingsByUser = async (userId) => {
  try {
    const ratings = await Rating.findAll({
      where: {
        user_id: userId
      },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price'],
          include: [
            {
              model: ProductColor,
              as: 'colors',
              attributes: ['id', 'color_name', 'color_code', 'image'],
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return ratings;
  } catch (error) {
    throw error;
  }
};

const getProductRatingStats = async (productId) => {
  try {
    const ratings = await Rating.findAll({
      where: {
        product_id: productId
      },
      attributes: ['star']
    });
    
    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        averageRating: 0,
        starDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      };
    }
    
    const totalRatings = ratings.length;
    const totalStars = ratings.reduce((sum, rating) => sum + rating.star, 0);
    const averageRating = totalStars / totalRatings;
    
    const starDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    
    ratings.forEach(rating => {
      starDistribution[rating.star]++;
    });
    
    return {
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      starDistribution
    };
  } catch (error) {
    throw error;
  }
};

const getAllRatings = async (page = 1, limit = 10, search = '') => {
  try {
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    const includeClause = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price']
      }
    ];
    
    if (search) {
      includeClause[1].where = {
        name: {
          [Op.like]: `%${search}%`
        }
      };
    }
    
    const { count, rows } = await Rating.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      itemsPerPage: limit,
      ratings: rows
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createRating,
  updateRating,
  deleteRating,
  getRatingsByProduct,
  getRatingsByUser,
  getProductRatingStats,
  getAllRatings
}; 