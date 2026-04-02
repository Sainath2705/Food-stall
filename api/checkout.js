const { handleCheckout } = require("../backend");

module.exports = function handler(request, response) {
  return handleCheckout(request, response);
};
