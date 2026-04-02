const { handleMenu } = require("../backend");

module.exports = function handler(request, response) {
  return handleMenu(request, response);
};
