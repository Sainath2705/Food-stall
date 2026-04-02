const { handleUpiQr } = require("../../backend");

module.exports = function handler(request, response) {
  return handleUpiQr(request, response);
};
