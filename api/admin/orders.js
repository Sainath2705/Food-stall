const { handleAdminOrders } = require("../../backend");

module.exports = function handler(request, response) {
  return handleAdminOrders(request, response);
};
