const { Order, OrderItem, Product, ProductColor, ProductSize, ColorSize, Voucher, Payment } = require('../models');
const { Op } = require('sequelize');
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
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['id', 'paymentType', 'status', 'amount', 'responseData']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
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
    adminSockets.forEach(({ socket }) => {
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

const createOrder = async ({ phone, name, address, items, total, user_id, voucherId }, io, adminSockets) => {
  const transaction = await sequelize.transaction();
  try {

    // 1. Tạo order (trong transaction)
    const order = await Order.create({ phone, name, address, items, total, user_id, voucherId }, { transaction });

    await Voucher.update({
      used_count: sequelize.literal(`used_count + 1`),
      useage_limit: sequelize.literal(`useage_limit - 1`)
    }, {
      where: { id: voucherId },
      transaction
    });

    // 2. Xử lý và tạo order items với color_size_id mapping
    const orderItemsData = [];

    for (const item of items) {
      let colorSizeId = null;
      let price = 0;

      // Lấy giá sản phẩm từ database (trong transaction)
      const product = await Product.findByPk(item.product_id, { transaction });
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }
      price = product.price;

      // Xử lý color_size_id - ĐẢM BẢO LUÔN CÓ GIÁ TRỊ
      if (item.color_id && item.size_id) {
        // Tìm ColorSize hiện có (trong transaction)
        let colorSize = await ColorSize.findOne({
          where: {
            product_color_id: item.color_id,
            product_size_id: item.size_id
          },
          transaction
        });

        // Nếu không tìm thấy, tạo mới (trong transaction)
        if (!colorSize) {
          console.log(`⚠️ ColorSize not found, creating new one for color: ${item.color_id}, size: ${item.size_id}`);

          // Validate color và size tồn tại (trong transaction)
          const [productColor, productSize] = await Promise.all([
            ProductColor.findByPk(item.color_id, { transaction }),
            ProductSize.findByPk(item.size_id, { transaction })
          ]);

          if (!productColor || productColor.product_id !== product.id) {
            throw new Error(`Invalid color ID ${item.color_id} for product ${item.product_id}`);
          }

          if (!productSize) {
            throw new Error(`Invalid size ID ${item.size_id}`);
          }

          // Tạo ColorSize mới (trong transaction)
          colorSize = await ColorSize.create({
            product_id: product.id,
            product_color_id: item.color_id,
            product_size_id: item.size_id
          }, { transaction });

          console.log(`✅ Created new ColorSize with ID: ${colorSize.id}`);
        }

        colorSizeId = colorSize.id;
      } else {
        // Nếu không có color_id hoặc size_id, reject order
        throw new Error(`Missing color_id or size_id for product ${item.product_id}. color_id: ${item.color_id}, size_id: ${item.size_id}`);
      }

      // Đảm bảo colorSizeId không bao giờ null
      if (!colorSizeId) {
        throw new Error(`Failed to determine color_size_id for product ${item.product_id}`);
      }

      // Tạo order item data với các field cần thiết
      const orderItemData = {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: price,
        color_size_id: colorSizeId // ĐẢM BẢO LUÔN CÓ GIÁ TRỊ
      };

      orderItemsData.push(orderItemData);
    }

    // Bulk create order items (trong transaction)
    await OrderItem.bulkCreate(orderItemsData, { transaction });

    // Commit transaction - Tất cả thành công
    await transaction.commit();

    // 3. Lấy order đầy đủ với relations (sau khi commit)
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

    // 5. Gửi push notification cho mobile client
    try {
      // Gửi notification cho admin users
      await NotificationService.sendNotificationToAdmins(
        'Đơn hàng mới',
        `Có đơn hàng mới từ ${order.phone}`,
        {
          type: 'NEW_ORDER',
          orderId: order.id,
          total: order.total
        }
      );

      // Gửi notification cho user đã đặt hàng (nếu có user_id)
      if (user_id) {
        console.log('start send notification to user: ', user_id);
        
        await NotificationService.sendNotificationToUser(
          user_id,
          'Đơn hàng đã được tạo',
          `Đơn hàng #${order.id} của bạn đã được tạo thành công với tổng giá trị ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}`,
          {
            type: 'ORDER_CREATED',
            orderId: order.id,
            total: order.total
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending push notifications:', notificationError);
      // Không throw error vì đây không phải lỗi nghiêm trọng
    }

          // Clear cart if user is logged in (sau khi commit)
      if (user_id) {
        try {
          const CartService = require('./cart.service');
          await CartService.clearCart(user_id);
          console.error('✅ Cart cleared for user:', user_id);
        } catch (error) {
          console.error('⚠️ Failed to clear cart:', error.message);
        }
      }

    return createdOrder;
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await transaction.rollback();
    console.error('❌ Order creation transaction rolled back due to error:', error);
    throw error;
  }
};

const updateOrder = async ({ id, status }) => {

  try {
    const currentOrder = await Order.findByPk(id);
    if (!currentOrder) throw new Error('Order not found');

    // Lưu trạng thái cũ để so sánh
    const oldStatus = currentOrder.status;
    
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

    // Gửi notification cho user nếu trạng thái thay đổi và có user_id
    if (oldStatus !== status && currentOrder.user_id) {
      try {
        // Tạo message tùy theo trạng thái
        let title = 'Cập nhật đơn hàng';
        let body = '';
        
        switch (status) {
          case 'pending':
            body = `Đơn hàng #${id} của bạn đang chờ xử lý`;
            break;
          case 'processing':
            body = `Đơn hàng #${id} của bạn đang được xử lý`;
            break;
          case 'cancelled':
            body = `Đơn hàng #${id} của bạn đã bị hủy`;
            break;
          case 'completed':
            body = `Đơn hàng #${id} của bạn đã hoàn thành`;
            break;
          default:
            body = `Trạng thái đơn hàng #${id} của bạn đã được cập nhật thành "${status}"`;
        }

        await NotificationService.sendNotificationToUser(
          currentOrder.user_id,
          title,
          body,
          {
            type: 'ORDER_STATUS_UPDATED',
            orderId: id,
            status: status,
            oldStatus: oldStatus
          }
        );

        console.log(`📱 Status update notification sent to user ${currentOrder.user_id} for order ${id}`);
      } catch (notificationError) {
        console.error('Error sending status update notification:', notificationError);
        // Không throw error vì đây không phải lỗi nghiêm trọng
      }
    }

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
  const orderUpdate = await order.update({ status: 'cancelled' });

  // Sau đó xóa đơn hàng
  return orderUpdate;
};

class OrderService {
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

    // Lưu trạng thái cũ để so sánh
    const oldStatus = order.status;
    
    order.status = status;
    await order.save();

    // Gửi notification cho user nếu trạng thái thay đổi và có user_id
    if (oldStatus !== status && order.user_id) {
      try {
        // Tạo message tùy theo trạng thái
        let title = 'Cập nhật đơn hàng';
        let body = '';
        
        switch (status) {
          case 'pending':
            body = `Đơn hàng #${orderId} của bạn đang chờ xử lý`;
            break;
          case 'processing':
            body = `Đơn hàng #${orderId} của bạn đang được xử lý`;
            break;
          case 'completed':
            body = `Đơn hàng #${orderId} của bạn đã hoàn thành`;
            break;
          case 'cancelled':
            body = `Đơn hàng #${orderId} của bạn đã bị hủy`;
            break;
          default:
            body = `Trạng thái đơn hàng #${orderId} của bạn đã được cập nhật thành "${status}"`;
        }

        await NotificationService.sendNotificationToUser(
          order.user_id,
          title,
          body,
          {
            type: 'ORDER_STATUS_UPDATED',
            orderId: orderId,
            status: status,
            oldStatus: oldStatus
          }
        );

        console.log(`📱 Status update notification sent to user ${order.user_id} for order ${orderId}`);
      } catch (notificationError) {
        console.error('Error sending status update notification:', notificationError);
        // Không throw error vì đây không phải lỗi nghiêm trọng
      }
    }

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