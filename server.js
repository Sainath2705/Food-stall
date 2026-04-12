const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const {
  getRuntimeInfo,
  handleAdminOrder,
  handleAdminOrders,
  handleCheckout,
  handleConfirmPayment,
  handleHealth,
  handleMenu,
  handleOrder,
  handleUpiQr,
  redirect,
  sendJson,
  sendText,
} = require("./backend");

const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 3000);
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function cacheControlFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".html" || extension === ".json") {
    return "no-store";
  }

  if (
    [
      ".css",
      ".ico",
      ".jpeg",
      ".jpg",
      ".js",
      ".png",
      ".svg",
      ".txt",
      ".webp",
    ].includes(extension)
  ) {
    return "public, max-age=3600, stale-while-revalidate=86400";
  }

  return "public, max-age=300";
}

function safePublicPath(pathname) {
  try {
    const decodedPath = decodeURIComponent(pathname);
    const resolvedPath = path.resolve(PUBLIC_DIR, `.${decodedPath}`);

    if (
      resolvedPath !== PUBLIC_DIR &&
      !resolvedPath.startsWith(`${PUBLIC_DIR}${path.sep}`)
    ) {
      return null;
    }

    return resolvedPath;
  } catch (error) {
    return null;
  }
}

function matchDynamicRoute(pathname, pattern) {
  const match = pathname.match(pattern);

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

async function handleApiRequest(request, response, pathname) {
  if (pathname === "/api/health") {
    return handleHealth(request, response);
  }

  if (pathname === "/api/menu") {
    return handleMenu(request, response);
  }

  if (pathname === "/api/checkout") {
    return handleCheckout(request, response);
  }

  if (pathname === "/api/upi/qr") {
    return handleUpiQr(request, response);
  }

  if (pathname === "/api/admin/orders") {
    return handleAdminOrders(request, response);
  }

  const orderPublicId = matchDynamicRoute(pathname, /^\/api\/orders\/([^/]+)$/);
  if (orderPublicId) {
    return handleOrder(request, response, { publicId: orderPublicId });
  }

  const confirmPublicId = matchDynamicRoute(
    pathname,
    /^\/api\/orders\/([^/]+)\/confirm-payment$/,
  );
  if (confirmPublicId) {
    return handleConfirmPayment(request, response, { publicId: confirmPublicId });
  }

  const adminPublicId = matchDynamicRoute(pathname, /^\/api\/admin\/orders\/([^/]+)$/);
  if (adminPublicId) {
    return handleAdminOrder(request, response, { publicId: adminPublicId });
  }

  sendJson(response, 404, { error: "API route not found." });
}

async function serveStatic(response, pathname) {
  if (pathname === "/") {
    return redirect(response, 307, "/index.html");
  }

  if (pathname === "/favicon.ico" || pathname === "/favicon.png") {
    response.statusCode = 204;
    return response.end();
  }

  const filePath = safePublicPath(pathname);

  if (!filePath) {
    return sendText(response, 400, "Bad request.");
  }

  try {
    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
      return redirect(response, 307, "/index.html");
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", contentTypeFor(filePath));
    response.setHeader("Cache-Control", cacheControlFor(filePath));
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    if (!path.extname(pathname)) {
      return redirect(response, 307, "/index.html");
    }

    sendText(response, 404, "Page not found.");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  const pathname = url.pathname;

  try {
    if (pathname.startsWith("/api/")) {
      return handleApiRequest(request, response, pathname);
    }

    return serveStatic(response, pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Unexpected server error." });
  }
});

module.exports = server;

if (require.main === module) {
  const runtimeInfo = getRuntimeInfo();

  server.listen(PORT, () => {
    console.log(`${runtimeInfo.appName} server running on http://localhost:${PORT}`);
    console.log(`UPI payment mode enabled for ${runtimeInfo.upiId}`);
    console.log(`Database mode: ${runtimeInfo.databaseMode}`);

    if (runtimeInfo.defaultAdminAccessKey && !process.env.ADMIN_ACCESS_KEY) {
      console.log(`Using default local admin key: ${runtimeInfo.defaultAdminAccessKey}`);
    }
  });
}
