const { handleHealth } = require("../backend");

module.exports = function handler(request, response) {
  return handleHealth(request, response);
};
