const { handleOrder } = require("../backend");

module.exports = function handler(request, response) {
  return handleOrder(request, response);
};
