require("dotenv").config();

const crypto = require("node:crypto");
const QRCode = require("qrcode");
const { Pool } = require("pg");

const APP_NAME = process.env.APP_NAME || "Stall 42";
const DATABASE_URL = String(
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "",
).trim();
const IS_VERCEL = process.env.VERCEL === "1";
const IS_PRODUCTION = process.env.NODE_ENV === "production" || IS_VERCEL;
const DEMO_MODE_ENABLED = !DATABASE_URL && !IS_PRODUCTION;
const DEFAULT_ADMIN_ACCESS_KEY = IS_PRODUCTION ? null : "stall42-admin";
const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY || DEFAULT_ADMIN_ACCESS_KEY;
const UPI_ID = process.env.UPI_ID || "sainathsherikar27@oksbi";
const UPI_NAME = process.env.UPI_NAME || "Sainath Sherikar";
const USE_DATABASE_SSL =
  Boolean(DATABASE_URL) &&
  !DATABASE_URL.includes("localhost") &&
  !DATABASE_URL.includes("127.0.0.1");

const fallbackMenu = [
  {
    id: "cat-drinks",
    name: "Drinks",
    slug: "drinks",
    sort_order: 1,
    items: [
      {
        id: "tea",
        category_id: "cat-drinks",
        name: "Tea",
        slug: "tea",
        description: "Freshly brewed tea to kickstart your class break.",
        price_paise: 1000,
        icon: "coffee",
        image_url: null,
        is_featured: false,
        is_active: true,
        sort_order: 1,
        prep_time_mins: 3,
      },
      {
        id: "coffee",
        category_id: "cat-drinks",
        name: "Coffee",
        slug: "coffee",
        description: "Strong and hot, made for quick campus energy.",
        price_paise: 1500,
        icon: "local_cafe",
        image_url: null,
        is_featured: false,
        is_active: true,
        sort_order: 2,
        prep_time_mins: 4,
      },
      {
        id: "coke",
        category_id: "cat-drinks",
        name: "Coke",
        slug: "coke",
        description: "Ice-cold fizzy refreshment for the afternoon rush.",
        price_paise: 2000,
        icon: "water_drop",
        image_url: null,
        is_featured: false,
        is_active: true,
        sort_order: 3,
        prep_time_mins: 1,
      },
    ],
  },
  {
    id: "cat-snacks",
    name: "Snacks",
    slug: "snacks",
    sort_order: 2,
    items: [
      {
        id: "maggi",
        category_id: "cat-snacks",
        name: "Maggi",
        slug: "maggi",
        description: "The classic college comfort bowl. Hot, quick, and spicy.",
        price_paise: 3000,
        icon: "ramen_dining",
        image_url:
          "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80",
        is_featured: true,
        is_active: true,
        sort_order: 1,
        prep_time_mins: 8,
      },
      {
        id: "omelette",
        category_id: "cat-snacks",
        name: "Omelette",
        slug: "omelette",
        description: "Soft, hot omelette folded fresh on the tawa.",
        price_paise: 2500,
        icon: "egg",
        image_url: null,
        is_featured: false,
        is_active: true,
        sort_order: 2,
        prep_time_mins: 6,
      },
      {
        id: "bread-omelette",
        category_id: "cat-snacks",
        name: "Bread Omelette",
        slug: "bread-omelette",
        description: "A loaded hostel favorite that eats like a full meal.",
        price_paise: 4000,
        icon: "breakfast_dining",
        image_url: null,
        is_featured: false,
        is_active: true,
        sort_order: 3,
        prep_time_mins: 7,
      },
    ],
  },
];

function createDatabasePool() {
  if (!DATABASE_URL) {
    return null;
  }

  if (globalThis.__stall42Pool) {
    return globalThis.__stall42Pool;
  }

  const nextPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: USE_DATABASE_SSL
      ? {
          rejectUnauthorized: false,
        }
      : false,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });

  globalThis.__stall42Pool = nextPool;
  return nextPool;
}

const pool = createDatabasePool();

if (!globalThis.__stall42DemoState) {
  globalThis.__stall42DemoState = {
    orders: [],
    sequence: 1,
  };
}

const demoState = globalThis.__stall42DemoState;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatError(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function getStatusCode(error, fallbackStatusCode) {
  return Number(error?.statusCode) || fallbackStatusCode;
}

function sendJson(response, statusCode, payload) {
  if (!response.headersSent) {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
  }

  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  if (!response.headersSent) {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", contentType);
  }

  response.end(body);
}

function redirect(response, statusCode, location) {
  response.statusCode = statusCode;
  response.setHeader("Location", location);
  response.end();
}

function sendError(response, error, fallbackMessage, fallbackStatusCode = 500) {
  sendJson(response, getStatusCode(error, fallbackStatusCode), {
    error: formatError(error, fallbackMessage),
  });
}

function sendMethodNotAllowed(response, allowedMethods) {
  response.setHeader("Allow", allowedMethods.join(", "));
  sendJson(response, 405, { error: "Method not allowed." });
}

function requireDatabase() {
  if (!pool) {
    throw createHttpError(503, "Supabase database is not configured.");
  }

  return pool;
}

function requireDemoMode() {
  if (!DEMO_MODE_ENABLED) {
    throw createHttpError(503, "Supabase database is not configured.");
  }
}

function getHeader(request, name) {
  const value = request.headers?.[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return String(value || "");
}

function requireAdmin(request) {
  if (!ADMIN_ACCESS_KEY) {
    throw createHttpError(500, "ADMIN_ACCESS_KEY is not configured.");
  }

  if (getHeader(request, "x-admin-key") !== ADMIN_ACCESS_KEY) {
    throw createHttpError(401, "Unauthorized");
  }
}

function sanitizePhoneNumber(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function buildPublicOrderId() {
  return `ST42-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function buildDemoOrderId() {
  const padded = String(demoState.sequence).padStart(4, "0");
  demoState.sequence += 1;
  return `ST42-DEMO-${padded}`;
}

function getFallbackItems() {
  return fallbackMenu.flatMap((category) => category.items);
}

function parseRawPayload(rawPayload) {
  if (rawPayload && typeof rawPayload === "object") {
    return rawPayload;
  }

  if (typeof rawPayload === "string") {
    try {
      return JSON.parse(rawPayload);
    } catch (error) {
      return {};
    }
  }

  return {};
}

async function fetchMenuFromDatabase() {
  const activePool = requireDatabase();
  const [categoriesResult, itemsResult] = await Promise.all([
    activePool.query(
      "select id, name, slug, sort_order from categories order by sort_order asc",
    ),
    activePool.query(
      "select id, category_id, name, slug, description, price_paise, icon, image_url, is_featured, is_active, sort_order, prep_time_mins from menu_items where is_active = true order by sort_order asc",
    ),
  ]);

  const itemsByCategory = new Map();
  itemsResult.rows.forEach((item) => {
    const list = itemsByCategory.get(item.category_id) || [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  });

  return categoriesResult.rows.map((category) => ({
    ...category,
    items: itemsByCategory.get(category.id) || [],
  }));
}

async function getMenuData() {
  if (!pool) {
    return fallbackMenu;
  }

  return fetchMenuFromDatabase();
}

async function getMenuItemsByIds(itemIds) {
  if (!pool) {
    requireDemoMode();
    const itemMap = new Map(getFallbackItems().map((item) => [item.id, item]));
    return itemIds.map((itemId) => itemMap.get(itemId)).filter(Boolean);
  }

  const activePool = requireDatabase();
  const result = await activePool.query(
    "select id, category_id, name, slug, description, price_paise, icon, image_url, is_featured, is_active, sort_order, prep_time_mins from menu_items where id = any($1::uuid[]) and is_active = true",
    [itemIds],
  );

  return result.rows;
}

function estimateReadyAt(lines, menuItems) {
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));
  const longestPrepTime = lines.reduce((max, line) => {
    const prep = Number(menuItemMap.get(line.itemId)?.prep_time_mins || 5);
    return Math.max(max, prep);
  }, 5);
  const totalUnits = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const readyInMinutes = longestPrepTime + Math.max(2, totalUnits);

  return new Date(Date.now() + readyInMinutes * 60 * 1000);
}

function calculateSubtotal(lines, menuItems) {
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

  return lines.reduce((sum, line) => {
    const item = menuItemMap.get(line.itemId);

    if (!item) {
      throw createHttpError(400, "One of the selected items is no longer available.");
    }

    return sum + Number(item.price_paise) * Number(line.quantity);
  }, 0);
}

function validateCheckoutPayload(body) {
  const customerName = String(body.customerName || "").trim();
  const customerPhone = sanitizePhoneNumber(body.customerPhone);
  const notes = String(body.notes || "").trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (customerName.length < 2) {
    throw createHttpError(400, "Please enter a valid name.");
  }

  if (customerPhone.length < 10) {
    throw createHttpError(400, "Please enter a valid phone number.");
  }

  if (!items.length) {
    throw createHttpError(400, "Your cart is empty.");
  }

  items.forEach((item) => {
    if (!item.itemId || Number(item.quantity) < 1) {
      throw createHttpError(400, "Cart contains an invalid item.");
    }
  });

  return {
    customerName,
    customerPhone,
    notes,
    items,
  };
}

function formatAmountForUpi(amountPaise) {
  return (Number(amountPaise) / 100).toFixed(2);
}

function buildUpiLink(order) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_NAME,
    am: formatAmountForUpi(order.subtotal_paise),
    cu: "INR",
    tn: `${APP_NAME} ${order.public_id}`,
    tr: order.public_id,
  });

  return `upi://pay?${params.toString()}`;
}

async function buildQrSvg(order) {
  return QRCode.toString(buildUpiLink(order), {
    type: "svg",
    width: 320,
    margin: 1,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}

function attachPaymentMeta(order, paymentRow) {
  if (!paymentRow) {
    order.payment_meta = null;
    return order;
  }

  const rawPayload = parseRawPayload(paymentRow.raw_payload);

  order.payment_meta = {
    provider: paymentRow.provider,
    status: paymentRow.status,
    app: rawPayload.paymentApp || null,
    reference: rawPayload.paymentReference || null,
    submitted_at: rawPayload.submittedAt || paymentRow.created_at || null,
  };

  return order;
}

async function getOrderByPublicId(publicId) {
  if (!pool) {
    requireDemoMode();
    return demoState.orders.find((order) => order.public_id === publicId) || null;
  }

  const activePool = requireDatabase();
  const orderResult = await activePool.query(
    "select id, public_id, customer_name, customer_phone, notes, status, payment_status, subtotal_paise, estimated_ready_at, created_at from orders where public_id = $1 limit 1",
    [publicId],
  );

  if (!orderResult.rows.length) {
    return null;
  }

  const order = orderResult.rows[0];
  const [orderItemsResult, paymentResult] = await Promise.all([
    activePool.query(
      "select id, quantity, item_name, unit_price_paise from order_items where order_id = $1 order by created_at asc",
      [order.id],
    ),
    activePool.query(
      "select provider, status, raw_payload, created_at from payments where order_id = $1 order by created_at desc limit 1",
      [order.id],
    ),
  ]);

  order.order_items = orderItemsResult.rows;
  return attachPaymentMeta(order, paymentResult.rows[0] || null);
}

async function listRecentOrders() {
  if (!pool) {
    requireDemoMode();
    return [...demoState.orders].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }

  const activePool = requireDatabase();
  const ordersResult = await activePool.query(
    "select id, public_id, customer_name, customer_phone, notes, status, payment_status, subtotal_paise, estimated_ready_at, created_at from orders order by created_at desc limit 50",
  );

  if (!ordersResult.rows.length) {
    return [];
  }

  const orderIds = ordersResult.rows.map((order) => order.id);
  const [orderItemsResult, paymentsResult] = await Promise.all([
    activePool.query(
      "select order_id, id, quantity, item_name, unit_price_paise from order_items where order_id = any($1::uuid[]) order by created_at asc",
      [orderIds],
    ),
    activePool.query(
      "select distinct on (order_id) order_id, provider, status, raw_payload, created_at from payments where order_id = any($1::uuid[]) order by order_id, created_at desc",
      [orderIds],
    ),
  ]);

  const itemsByOrderId = new Map();
  orderItemsResult.rows.forEach((item) => {
    const list = itemsByOrderId.get(item.order_id) || [];
    list.push({
      id: item.id,
      quantity: item.quantity,
      item_name: item.item_name,
      unit_price_paise: item.unit_price_paise,
    });
    itemsByOrderId.set(item.order_id, list);
  });

  const paymentsByOrderId = new Map();
  paymentsResult.rows.forEach((payment) => {
    paymentsByOrderId.set(payment.order_id, payment);
  });

  return ordersResult.rows.map((order) =>
    attachPaymentMeta(
      {
        ...order,
        order_items: itemsByOrderId.get(order.id) || [],
      },
      paymentsByOrderId.get(order.id) || null,
    ),
  );
}

function getRequestUrl(request) {
  return new URL(request.url || "/", "http://localhost");
}

function getQuery(request) {
  if (request.query && typeof request.query === "object") {
    return request.query;
  }

  return Object.fromEntries(getRequestUrl(request).searchParams.entries());
}

function getQueryValue(request, key) {
  const value = getQuery(request)[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return String(value || "");
}

function getMethod(request) {
  return String(request.method || "GET").toUpperCase();
}

async function readRequestBody(request) {
  if (request.__stallBody !== undefined) {
    return request.__stallBody;
  }

  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    request.__stallBody = request.body;
    return request.__stallBody;
  }

  if (typeof request.body === "string") {
    try {
      request.__stallBody = request.body ? JSON.parse(request.body) : {};
      return request.__stallBody;
    } catch (error) {
      throw createHttpError(400, "Invalid JSON body.");
    }
  }

  if (["GET", "HEAD"].includes(getMethod(request))) {
    request.__stallBody = {};
    return request.__stallBody;
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  const contentType = getHeader(request, "content-type").split(";")[0].trim().toLowerCase();

  if (!rawBody) {
    request.__stallBody = {};
    return request.__stallBody;
  }

  try {
    if (contentType === "application/x-www-form-urlencoded") {
      request.__stallBody = Object.fromEntries(new URLSearchParams(rawBody));
      return request.__stallBody;
    }

    request.__stallBody = JSON.parse(rawBody);
    return request.__stallBody;
  } catch (error) {
    throw createHttpError(400, "Invalid JSON body.");
  }
}

function resolvePublicId(request, params = {}) {
  return String(params.publicId || getQueryValue(request, "publicId") || "").trim();
}

function getDatabaseMode() {
  return pool ? "supabase" : DEMO_MODE_ENABLED ? "demo" : "missing";
}

async function handleHealth(request, response) {
  if (getMethod(request) !== "GET") {
    return sendMethodNotAllowed(response, ["GET"]);
  }

  sendJson(response, 200, {
    ok: true,
    database: getDatabaseMode(),
    appName: APP_NAME,
  });
}

async function handleMenu(request, response) {
  if (getMethod(request) !== "GET") {
    return sendMethodNotAllowed(response, ["GET"]);
  }

  try {
    const categories = await getMenuData();
    sendJson(response, 200, {
      appName: APP_NAME,
      categories,
      payment: {
        type: "upi_qr",
        upiId: UPI_ID,
        payeeName: UPI_NAME,
      },
    });
  } catch (error) {
    sendError(response, error, "Unable to load menu.");
  }
}

async function handleCheckout(request, response) {
  if (getMethod(request) !== "POST") {
    return sendMethodNotAllowed(response, ["POST"]);
  }

  try {
    const body = await readRequestBody(request);
    const validated = validateCheckoutPayload(body);
    const menuItems = await getMenuItemsByIds(validated.items.map((item) => item.itemId));
    const subtotalPaise = calculateSubtotal(validated.items, menuItems);
    const readyAt = estimateReadyAt(validated.items, menuItems);

    if (!pool) {
      requireDemoMode();

      const publicId = buildDemoOrderId();
      const createdAt = new Date().toISOString();
      const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));
      const order = {
        id: `demo-${publicId}`,
        public_id: publicId,
        customer_name: validated.customerName,
        customer_phone: validated.customerPhone,
        notes: validated.notes || null,
        subtotal_paise: subtotalPaise,
        status: "pending",
        payment_status: "created",
        estimated_ready_at: readyAt.toISOString(),
        created_at: createdAt,
        order_items: validated.items.map((line, index) => {
          const item = menuItemMap.get(line.itemId);
          return {
            id: `demo-line-${publicId}-${index + 1}`,
            quantity: Number(line.quantity),
            item_name: item.name,
            unit_price_paise: Number(item.price_paise),
          };
        }),
        payment_meta: null,
      };

      demoState.orders.unshift(order);

      return sendJson(response, 200, {
        mode: "upi",
        order: {
          internalId: order.id,
          publicId: order.public_id,
          amountPaise: order.subtotal_paise,
          estimatedReadyAt: order.estimated_ready_at,
        },
        payment: {
          upiId: UPI_ID,
          payeeName: UPI_NAME,
          upiLink: buildUpiLink(order),
          gpayQrUrl: `/api/upi/qr?orderId=${encodeURIComponent(order.public_id)}&app=gpay`,
          phonepeQrUrl: `/api/upi/qr?orderId=${encodeURIComponent(order.public_id)}&app=phonepe`,
        },
      });
    }

    const activePool = requireDatabase();
    const databaseClient = await activePool.connect();

    try {
      await databaseClient.query("begin");

      const orderResult = await databaseClient.query(
        "insert into orders (public_id, customer_name, customer_phone, notes, subtotal_paise, estimated_ready_at) values ($1, $2, $3, $4, $5, $6) returning id, public_id, subtotal_paise, estimated_ready_at",
        [
          buildPublicOrderId(),
          validated.customerName,
          validated.customerPhone,
          validated.notes || null,
          subtotalPaise,
          readyAt,
        ],
      );

      const order = orderResult.rows[0];
      const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

      for (const line of validated.items) {
        const item = menuItemMap.get(line.itemId);

        if (!item) {
          throw createHttpError(400, "One of the selected items is no longer available.");
        }

        await databaseClient.query(
          "insert into order_items (order_id, menu_item_id, item_name, quantity, unit_price_paise) values ($1, $2, $3, $4, $5)",
          [order.id, item.id, item.name, Number(line.quantity), Number(item.price_paise)],
        );
      }

      await databaseClient.query("commit");

      return sendJson(response, 200, {
        mode: "upi",
        order: {
          internalId: order.id,
          publicId: order.public_id,
          amountPaise: Number(order.subtotal_paise),
          estimatedReadyAt: order.estimated_ready_at,
        },
        payment: {
          upiId: UPI_ID,
          payeeName: UPI_NAME,
          upiLink: buildUpiLink(order),
          gpayQrUrl: `/api/upi/qr?orderId=${encodeURIComponent(order.public_id)}&app=gpay`,
          phonepeQrUrl: `/api/upi/qr?orderId=${encodeURIComponent(order.public_id)}&app=phonepe`,
        },
      });
    } catch (error) {
      await databaseClient.query("rollback");
      throw error;
    } finally {
      databaseClient.release();
    }
  } catch (error) {
    sendError(response, error, "Unable to start checkout.");
  }
}

async function handleUpiQr(request, response) {
  if (getMethod(request) !== "GET") {
    return sendMethodNotAllowed(response, ["GET"]);
  }

  try {
    const publicId = String(getQueryValue(request, "orderId") || "").trim();
    const order = await getOrderByPublicId(publicId);

    if (!order) {
      return sendJson(response, 404, { error: "Order not found." });
    }

    const svg = await buildQrSvg(order);
    sendText(response, 200, svg, "image/svg+xml; charset=utf-8");
  } catch (error) {
    sendError(response, error, "Unable to generate QR.");
  }
}

async function handleConfirmPayment(request, response, params = {}) {
  if (getMethod(request) !== "POST") {
    return sendMethodNotAllowed(response, ["POST"]);
  }

  try {
    const publicId = resolvePublicId(request, params);
    const body = await readRequestBody(request);
    const paymentApp = String(body.paymentApp || "upi").trim();
    const paymentReference = String(body.paymentReference || "").trim();
    const submittedAt = new Date().toISOString();

    if (!publicId) {
      return sendJson(response, 400, { error: "Order token is required." });
    }

    if (!pool) {
      requireDemoMode();

      const order = demoState.orders.find((entry) => entry.public_id === publicId);

      if (!order) {
        return sendJson(response, 404, { error: "Order not found." });
      }

      order.payment_status = "authorized";
      order.payment_meta = {
        provider: "upi_qr",
        status: "authorized",
        app: paymentApp,
        reference: paymentReference || null,
        submitted_at: submittedAt,
      };

      return sendJson(response, 200, {
        success: true,
        redirectTo: `/success.html?orderId=${encodeURIComponent(publicId)}`,
      });
    }

    const activePool = requireDatabase();
    const orderResult = await activePool.query(
      "select id, public_id, subtotal_paise from orders where public_id = $1 limit 1",
      [publicId],
    );

    if (!orderResult.rows.length) {
      return sendJson(response, 404, { error: "Order not found." });
    }

    const order = orderResult.rows[0];

    await activePool.query("update orders set payment_status = $1 where id = $2", [
      "authorized",
      order.id,
    ]);

    await activePool.query(
      "insert into payments (order_id, provider, amount_paise, status, raw_payload) values ($1, $2, $3, $4, $5)",
      [
        order.id,
        "upi_qr",
        Number(order.subtotal_paise),
        "authorized",
        JSON.stringify({
          paymentApp,
          paymentReference: paymentReference || null,
          submittedAt,
          upiId: UPI_ID,
          payeeName: UPI_NAME,
        }),
      ],
    );

    sendJson(response, 200, {
      success: true,
      redirectTo: `/success.html?orderId=${encodeURIComponent(publicId)}`,
    });
  } catch (error) {
    sendError(response, error, "Unable to confirm your payment submission.");
  }
}

async function handleOrder(request, response, params = {}) {
  if (getMethod(request) !== "GET") {
    return sendMethodNotAllowed(response, ["GET"]);
  }

  try {
    const publicId = resolvePublicId(request, params);

    if (!publicId) {
      return sendJson(response, 400, { error: "Order token is required." });
    }

    const order = await getOrderByPublicId(publicId);

    if (!order) {
      return sendJson(response, 404, { error: "Order not found." });
    }

    sendJson(response, 200, { order });
  } catch (error) {
    sendError(response, error, "Unable to load order.");
  }
}

async function handleAdminOrders(request, response) {
  if (getMethod(request) !== "GET") {
    return sendMethodNotAllowed(response, ["GET"]);
  }

  try {
    requireAdmin(request);
    const orders = await listRecentOrders();
    sendJson(response, 200, { orders });
  } catch (error) {
    sendError(response, error, "Unable to load admin orders.", 400);
  }
}

async function handleAdminOrder(request, response, params = {}) {
  if (getMethod(request) !== "PATCH") {
    return sendMethodNotAllowed(response, ["PATCH"]);
  }

  const allowedStatuses = new Set(["pending", "paid", "preparing", "ready", "completed"]);

  try {
    requireAdmin(request);

    const body = await readRequestBody(request);
    const nextStatus = String(body.status || "").trim();
    const publicId = resolvePublicId(request, params);

    if (!allowedStatuses.has(nextStatus)) {
      return sendJson(response, 400, { error: "Invalid order status." });
    }

    if (!publicId) {
      return sendJson(response, 400, { error: "Order token is required." });
    }

    if (!pool) {
      requireDemoMode();

      const order = demoState.orders.find((entry) => entry.public_id === publicId);

      if (!order) {
        return sendJson(response, 404, { error: "Order not found." });
      }

      order.status = nextStatus;
      if (nextStatus === "paid") {
        order.payment_status = "captured";
        if (order.payment_meta) {
          order.payment_meta.status = "captured";
        }
      }

      return sendJson(response, 200, { success: true });
    }

    const activePool = requireDatabase();
    const updateResult = await activePool.query(
      "update orders set status = $1, payment_status = case when $1 = 'paid' then 'captured' else payment_status end where public_id = $2 returning id",
      [nextStatus, publicId],
    );

    if (!updateResult.rows.length) {
      return sendJson(response, 404, { error: "Order not found." });
    }

    if (nextStatus === "paid") {
      await activePool.query(
        "update payments set status = 'captured' where order_id = $1 and status = 'authorized'",
        [updateResult.rows[0].id],
      );
    }

    sendJson(response, 200, { success: true });
  } catch (error) {
    sendError(response, error, "Unable to update order status.", 400);
  }
}

function getRuntimeInfo() {
  return {
    appName: APP_NAME,
    upiId: UPI_ID,
    databaseMode: getDatabaseMode(),
    defaultAdminAccessKey: DEFAULT_ADMIN_ACCESS_KEY,
  };
}

module.exports = {
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
};
