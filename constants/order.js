const STATUS_ORDER = {
    PENDING: 'PENDING',           // Chờ xử lý
    CONFIRMED: 'CONFIRMED',       // Đã xác nhận
    SHIPPING: 'SHIPPING',         // Đang giao hàng
    DELIVERED: 'DELIVERED',       // Đã giao (nhưng chưa xác nhận hoàn tất)
    COMPLETED: 'COMPLETED',       // Đã hoàn thành
    CANCELLED: 'CANCELLED'        // Đã hủy
};

module.exports = { STATUS_ORDER }; 
