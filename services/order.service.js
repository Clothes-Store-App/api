const { Order, OrderItem, Product, ProductColor, ProductSize, ColorSize } = require('../models');
const { PAGINATION } = require('../constants/pagination');
const { where, Op } = require('sequelize');
const NotificationService = require('./notification.service');
const { sequelize } = require('../models');

const getAllOrders = async (userId) => {
  try {
    const orders = await Order.findAll({
      where: {
        user_id: userId // Lọc theo user_id
      },
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: Product,
              as: 'product'
            },
            {
              model: ColorSize,
              as: 'colorSize',
              include: [
                {
                  model: ProductColor,
                  as: 'color',
                  attributes: ['id', 'color_name', 'color_code', 'image']
                },
                {
                  model: ProductSize,
                  as: 'size',
                  attributes: ['id', 'size_name']
                }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    console.log('orders', orders);
    return orders;
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    throw error;
  }
};

const getAllOrdersByAdmin = async ({
  page = 1,
  limit = 10,
  search = '',
  sort = 'DESC',
  status = '',
}) => {  
  try {
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Nếu có status thì thêm điều kiện lọc theo status
    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.name = {
        [Op.like]: `%${search}%`,
      };
    }

    // Đếm tổng số đơn hàng trước
    const totalCount = await Order.count({
      where: whereClause
    });

    // Tính toán số trang thực tế
    const totalPages = Math.ceil(totalCount / limit);
    
    // Kiểm tra nếu page vượt quá totalPages
    if (page > totalPages) {
      return {
        totalItems: totalCount,
        totalPages,
        currentPage: totalPages, // Trả về trang cuối cùng nếu page yêu cầu vượt quá
        itemsPerPage: limit,
        orders: []
      };
    }

    const { rows } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: Product,
              as: 'product'
            },
            {
              model: ColorSize,
              as: 'colorSize',
              include: [
                {
                  model: ProductColor,
                  as: 'color',
                  attributes: ['id', 'color_name', 'color_code', 'image']
                },
                {
                  model: ProductSize,
                  as: 'size',
                  attributes: ['id', 'size_name']
                }
              ]
            }
          ]
        }
      ],
      limit,
      offset,
      order: [['createdAt', sort.toUpperCase()]]
    });

    return {
      totalItems: totalCount,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      orders: rows
    };
  } catch (error) {
    console.error("Error in getAllOrdersByAdmin:", error);
    throw error;
  }
};

// Thêm hàm mới để xử lý socket notification
const sendOrderNotificationViaSocket = (order, io, adminSockets) => {
  if (!io || !adminSockets) {
    console.log('Socket.IO not initialized or no admin sockets available');
    return;
  }

  try {
    const notification = {
      type: 'NEW_ORDER',
      message: `Có đơn hàng mới từ ${order.phone} với tổng giá trị ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}`,
      order: {
        id: order.id,
        phone: order.phone,
        total: order.total,
        createdAt: order.createdAt,
        status: order.status
      }
    };

    // Log số lượng admin đang online
    console.log(`Sending socket notification to ${adminSockets.size} online admins`);

    // Gửi thông báo cho từng admin socket
    let sentCount = 0;
    adminSockets.forEach(({socket}) => {
      try {
        socket.emit('notification', notification);
        sentCount++;
      } catch (socketError) {
        console.error(`Failed to send notification to socket ${socket.id}:`, socketError);
      }
    });

    console.log(`Successfully sent notifications to ${sentCount} admins`);
    return true;
  } catch (error) {
    console.error('Error sending socket notification:', error);
    return false;
  }
};

const createOrder = async ({phone, name, address, items, total}, io, adminSockets) => {  
  try {
    // 1. Tạo order
    const order = await Order.create({phone, name, address, total});    
    // 2. Tạo order items
    const orderItemsWithOrderId = items.map(item => ({ ...item, order_id: order.id }));
    await OrderItem.bulkCreate(orderItemsWithOrderId);
    
    // 3. Lấy order đầy đủ với relations
    const createdOrder = await Order.findByPk(order.id, {
      include: [{ 
        model: OrderItem, 
        as: 'orderItems',
        include: [
          {
            model: Product,
            as: 'product'
          },
          {
            model: ColorSize,
            as: 'colorSize',
            include: [
              {
                model: ProductColor,
                as: 'color',
                attributes: ['id', 'color_name', 'color_code', 'image']
              },
              {
                model: ProductSize,
                as: 'size',
                attributes: ['id', 'size_name']
              }
            ]
          }
        ]
      }]
    });

    // 4. Gửi socket notification cho web client
    sendOrderNotificationViaSocket(createdOrder, io, adminSockets);

    // 5. Gửi push notification cho mobile client (đã có)
    try {
      await NotificationService.sendNotificationToAdmins(
        'Đơn hàng mới',
        `Có đơn hàng mới từ ${order.phone}`,
        {
          type: 'NEW_ORDER',
          orderId: order.id,
          total: order.total
        }
      );
    } catch (notificationError) {
      console.error('Error sending push notifications:', notificationError);
      // Không throw error vì đây không phải lỗi nghiêm trọng
    }
    
    return createdOrder;
  } catch (error) {
    console.error('Error in createOrder:', error);
    throw error;
  }
};

const updateOrder = async ({id, status}) => {
  
  try {
    const currentOrder = await Order.findByPk(id);
    if (!currentOrder) throw new Error('Order not found');
    
    currentOrder.status = status;
    const response = await currentOrder.save();
    
  // Trả về đơn hàng đã cập nhật với các orderItems
  const updatedOrder = await Order.findByPk(id, {
    include: [{ 
      model: OrderItem, 
      as: 'orderItems',
      include: [
        {
          model: Product,
          as: 'product'
        },
        {
          model: ColorSize,
          as: 'colorSize',
          include: [
            {
              model: ProductColor,
              as: 'color',
              attributes: ['id', 'color_name', 'color_code', 'image']
            },
            {
              model: ProductSize,
              as: 'size',
              attributes: ['id', 'size_name']
            }
          ]
        }
      ]
    }]
  });
  
  return updatedOrder;
  } catch (error) {
    console.error("Error in updateOrder:", error);
    throw error;
  }
};

const deleteOrder = async (id) => {
  const order = await Order.findByPk(id);
  if (!order) throw new Error('Order not found');
  
  // Xóa các orderItems trước
  await OrderItem.destroy({ where: { order_id: id } });
  
  // Sau đó xóa đơn hàng
  return await order.destroy();
};

class OrderService {
  async createOrder(orderData) {
    const { name, phone, address, items, total, user_id } = orderData;
    console.log('🛒 Creating order with data:', { name, phone, address, total, user_id, itemsCount: items.length });

    const transaction = await sequelize.transaction();

    try {
      // Create the order
      console.log('📝 Creating order record...');
      const order = await Order.create({
        user_id,
        name,
        phone,
        address,
        total,
        status: 'PENDING'
      }, { transaction });
      console.log('✅ Order created with ID:', order.id);

      // Create order items
      console.log('📦 Creating order items...');
      const orderItems = await Promise.all(
        items.map(async (item, index) => {
          console.log(`🔍 Processing item ${index + 1}:`, item);
          
          // Validate product exists
          const product = await Product.findByPk(item.product_id);
          if (!product) {
            console.error(`❌ Product not found: ${item.product_id}`);
            throw new Error(`Product with ID ${item.product_id} not found`);
          }
          console.log(`✅ Product found: ${product.name} - Price: ${product.price}`);

          // Try to find color_size_id from color_id + size_id
          let colorSizeId = null;
          if (item.color_id && item.size_id) {
            try {
              const { ColorSize } = require('../models');
              const colorSize = await ColorSize.findOne({
                where: {
                  product_color_id: item.color_id,
                  product_size_id: item.size_id
                }
              });
              colorSizeId = colorSize ? colorSize.id : null;
              console.log(`🎨 ColorSize found: ${colorSizeId}`);
            } catch (error) {
              console.log(`⚠️ Could not find ColorSize: ${error.message}`);
            }
          }

          // Create order item (only fields that exist in model)
          const orderItemData = {
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            color_size_id: colorSizeId
          };
          console.log(`📋 Creating order item:`, orderItemData);
          
          const orderItem = await OrderItem.create(orderItemData, { transaction });
          console.log(`✅ Order item created with ID: ${orderItem.id}`);
          
          return orderItem;
        })
      );

      await transaction.commit();
      console.log('🎉 Order creation completed successfully');
      
      // Clear cart if user is logged in
      if (user_id) {
        try {
          const CartService = require('./cart.service');
          await CartService.clearCart(user_id);
          console.log('✅ Cart cleared for user:', user_id);
        } catch (error) {
          console.log('⚠️ Failed to clear cart:', error.message);
        }
      }
      // Return order with items
      return {
        ...order.toJSON(),
        orderItems: orderItems.map(item => item.toJSON())
      };
    } catch (error) {
      console.error('💥 Order creation failed:', error.message);
      console.error('📋 Error details:', error);
      await transaction.rollback();
      throw error;
    }
  }

  async getOrders(filters = {}) {
    const { status, page = 1, limit = 10 } = filters;

    const where = {};
    if (status) where.status = status;

    const orders = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'price']
            },
            {
              model: ColorSize,
              as: 'colorSize',
              include: [
                {
                  model: ProductColor,
                  as: 'color',
                  attributes: ['id', 'color_name', 'color_code', 'image']
                },
                {
                  model: ProductSize,
                  as: 'size',
                  attributes: ['id', 'size_name']
                }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit
    });

    return {
      orders: orders.rows,
      pagination: {
        total: orders.count,
        page,
        totalPages: Math.ceil(orders.count / limit)
      }
    };
  }

  async getOrderById(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'price']
            },
            {
              model: ColorSize,
              as: 'colorSize',
              include: [
                {
                  model: ProductColor,
                  as: 'color',
                  attributes: ['id', 'color_name', 'color_code', 'image']
                },
                {
                  model: ProductSize,
                  as: 'size',
                  attributes: ['id', 'size_name']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async updateOrderStatus(orderId, status) {
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = status;
    await order.save();

    return order;
  }
}

module.exports = {
  // Export class instance methods first
  ...new OrderService(),
  // Then override with specific functions used by controller
  getAllOrders,
  getAllOrdersByAdmin,
  createOrder,
  updateOrder,
  deleteOrder
}; 