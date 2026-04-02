const { handleAdminOrder } = require("../backend");

module.exports = function handler(request, response) {
  return handleAdminOrder(request, response);
};
