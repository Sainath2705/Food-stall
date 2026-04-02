const { handleConfirmPayment } = require("../backend");

module.exports = function handler(request, response) {
  return handleConfirmPayment(request, response);
};
