require("dotenv").config();

const crypto = require("node:crypto");
const path = require("node:path");

const express = require("express");
const { Pool } = require("pg");
const QRCode = require("qrcode");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_NAME = process.env.APP_NAME || "Stall 42";
const DATABASE_URL = process.env.DATABASE_URL;
const DEFAULT_ADMIN_ACCESS_KEY =
  process.env.NODE_ENV === "production" ? null : "stall42-admin";
const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY || DEFAULT_ADMIN_ACCESS_KEY;
const UPI_ID = process.env.UPI_ID || "sainathsherikar27@oksbi";
const UPI_NAME = process.env.UPI_NAME || "Sainath Sherikar";
const HAS_DATABASE = Boolean(DATABASE_URL);
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
        prep_time_mins: 3
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
        prep_time_mins: 4
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
        prep_time_mins: 1
      }
    ]
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
        prep_time_mins: 8
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
        prep_time_mins: 6
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
        prep_time_mins: 7
      }
    ]
  }
];

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: USE_DATABASE_SSL
        ? {
            rejectUnauthorized: false
          }
        : false
    })
  : null;

const demoOrders = [];
let demoOrderSequence = 1;

app.use(express.json());

function formatError(error, fallbackMessage) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function requireDatabase() {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return pool;
}

function requireAdmin(request) {
  if (!ADMIN_ACCESS_KEY) {
    throw new Error("ADMIN_ACCESS_KEY is not configured.");
  }

  if (request.headers["x-admin-key"] !== ADMIN_ACCESS_KEY) {
    const unauthorized = new Error("Unauthorized");
    unauthorized.statusCode = 401;
    throw unauthorized;
  }
}

function sanitizePhoneNumber(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function buildPublicOrderId() {
  return `ST42-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function buildDemoOrderId() {
  const padded = String(demoOrderSequence).padStart(4, "0");
  demoOrderSequence += 1;
  return `ST42-DEMO-${padded}`;
}

function getFallbackItems() {
  return fallbackMenu.flatMap((category) => category.items);
}

async function fetchMenuFromDatabase() {
  const activePool = requireDatabase();
  const categoriesResult = await activePool.query(
    "select id, name, slug, sort_order from categories order by sort_order asc",
  );
  const itemsResult = await activePool.query(
    "select id, category_id, name, slug, description, price_paise, icon, image_url, is_featured, is_active, sort_order, prep_time_mins from menu_items where is_active = true order by sort_order asc",
  );

  const itemsByCategory = new Map();
  itemsResult.rows.forEach((item) => {
    const list = itemsByCategory.get(item.category_id) || [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  });

  return categoriesResult.rows.map((category) => ({
    ...category,
    items: itemsByCategory.get(category.id) || []
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
      throw new Error("One of the selected items is no longer available.");
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
    throw new Error("Please enter a valid name.");
  }

  if (customerPhone.length < 10) {
    throw new Error("Please enter a valid phone number.");
  }

  if (!items.length) {
    throw new Error("Your cart is empty.");
  }

  items.forEach((item) => {
    if (!item.itemId || Number(item.quantity) < 1) {
      throw new Error("Cart contains an invalid item.");
    }
  });

  return {
    customerName,
    customerPhone,
    notes,
    items
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
    tr: order.public_id
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
      light: "#ffffff"
    }
  });
}

function attachPaymentMeta(order, paymentRow) {
  if (!paymentRow) {
    order.payment_meta = null;
    return order;
  }

  const rawPayload =
    paymentRow.raw_payload && typeof paymentRow.raw_payload === "object"
      ? paymentRow.raw_payload
      : {};

  order.payment_meta = {
    provider: paymentRow.provider,
    status: paymentRow.status,
    app: rawPayload.paymentApp || null,
    reference: rawPayload.paymentReference || null,
    submitted_at: rawPayload.submittedAt || paymentRow.created_at || null
  };

  return order;
}

async function getOrderByPublicId(publicId) {
  if (!pool) {
    return demoOrders.find((order) => order.public_id === publicId) || null;
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
  const orderItemsResult = await activePool.query(
    "select id, quantity, item_name, unit_price_paise from order_items where order_id = $1 order by created_at asc",
    [order.id],
  );
  const paymentResult = await activePool.query(
    "select provider, status, raw_payload, created_at from payments where order_id = $1 order by created_at desc limit 1",
    [order.id],
  );

  order.order_items = orderItemsResult.rows;
  return attachPaymentMeta(order, paymentResult.rows[0] || null);
}

async function listRecentOrders() {
  if (!pool) {
    return [...demoOrders].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }

  const activePool = requireDatabase();
  const ordersResult = await activePool.query(
    "select id, public_id, customer_name, customer_phone, notes, status, payment_status, subtotal_paise, estimated_ready_at, created_at from orders order by created_at desc limit 50",
  );

  const orders = [];

  for (const order of ordersResult.rows) {
    const orderItemsResult = await activePool.query(
      "select id, quantity, item_name, unit_price_paise from order_items where order_id = $1 order by created_at asc",
      [order.id],
    );
    const paymentResult = await activePool.query(
      "select provider, status, raw_payload, created_at from payments where order_id = $1 order by created_at desc limit 1",
      [order.id],
    );

    orders.push(
      attachPaymentMeta(
        {
          ...order,
          order_items: orderItemsResult.rows
        },
        paymentResult.rows[0] || null,
      ),
    );
  }

  return orders;
}

app.get("/api/menu", async (request, response) => {
  try {
    const categories = await getMenuData();
    response.json({
      appName: APP_NAME,
      categories,
      payment: {
        type: "upi_qr",
        upiId: UPI_ID,
        payeeName: UPI_NAME
      }
    });
  } catch (error) {
    response.status(500).json({ error: formatError(error, "Unable to load menu.") });
  }
});

app.post("/api/checkout", async (request, response) => {
  try {
    const validated = validateCheckoutPayload(request.body);
    const menuItems = await getMenuItemsByIds(validated.items.map((item) => item.itemId));
    const subtotalPaise = calculateSubtotal(validated.items, menuItems);
    const readyAt = estimateReadyAt(validated.items, menuItems);

    if (!HAS_DATABASE) {
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
            unit_price_paise: Number(item.price_paise)
          };
        }),
        payment_meta: null
      };

      demoOrders.unshift(order);

      return response.json({
        mode: "upi",
        order: {
          internalId: order.id,
          publicId: order.public_id,
          amountPaise: order.subtotal_paise,
          estimatedReadyAt: order.estimated_ready_at
        },
        payment: {
          upiId: UPI_ID,
          payeeName: UPI_NAME,
          upiLink: buildUpiLink(order),
          gpayQrUrl: `/api/upi/qr?orderId=${encodeURIComponent(order.public_id)}&app=gpay`,
          phonepeQrUrl: `/api/upi/qr?orderId=${encodeURIComponent(order.public_id)}&app=phonepe`
        }
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
          readyAt
        ],
      );

      const order = orderResult.rows[0];
      const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

      for (const line of validated.items) {
        const item = menuItemMap.get(line.itemId);

        if (!item) {
          throw new Error("One of the selected items is no longer available.");
        }

        await databaseClient.query(
          "insert into order_items (order_id, menu_item_id, item_name, quantity, unit_price_paise) values ($1, $2, $3, $4, $5)",
          [order.id, item.id, item.name, Number(line.quantity), Number(item.price_paise)],
        );
      }

      await databaseClient.query("commit");

      response.json({
        mode: "upi",
        order: {
          internalId: order.id,
          publicId: order.public_id,
          amountPaise: Number(order.subtotal_paise),
          estimatedReadyAt: order.estimated_ready_at
        },
        payment: {
          upiId: UPI_ID,
          payeeName: UPI_NAME,
          upiLink: buildUpiLink(order),
          gpayQrUrl: `/api/upi/qr?orderId=${encodeURIComponent(order.public_id)}&app=gpay`,
          phonepeQrUrl: `/api/upi/qr?orderId=${encodeURIComponent(order.public_id)}&app=phonepe`
        }
      });
    } catch (error) {
      await databaseClient.query("rollback");
      throw error;
    } finally {
      databaseClient.release();
    }
  } catch (error) {
    response.status(400).json({ error: formatError(error, "Unable to start checkout.") });
  }
});

app.get("/api/upi/qr", async (request, response) => {
  try {
    const publicId = String(request.query.orderId || "");
    const order = await getOrderByPublicId(publicId);

    if (!order) {
      return response.status(404).json({ error: "Order not found." });
    }

    const svg = await buildQrSvg(order);
    response.setHeader("Content-Type", "image/svg+xml");
    response.send(svg);
  } catch (error) {
    response.status(400).json({ error: formatError(error, "Unable to generate QR.") });
  }
});

app.post("/api/orders/:publicId/confirm-payment", async (request, response) => {
  try {
    const publicId = request.params.publicId;
    const paymentApp = String(request.body.paymentApp || "upi").trim();
    const paymentReference = String(request.body.paymentReference || "").trim();
    const submittedAt = new Date().toISOString();

    if (!HAS_DATABASE) {
      const order = demoOrders.find((entry) => entry.public_id === publicId);

      if (!order) {
        return response.status(404).json({ error: "Order not found." });
      }

      order.payment_status = "authorized";
      order.payment_meta = {
        provider: "upi_qr",
        status: "authorized",
        app: paymentApp,
        reference: paymentReference || null,
        submitted_at: submittedAt
      };

      return response.json({
        success: true,
        redirectTo: `/success.html?orderId=${encodeURIComponent(publicId)}`
      });
    }

    const activePool = requireDatabase();
    const orderResult = await activePool.query(
      "select id, public_id, subtotal_paise from orders where public_id = $1 limit 1",
      [publicId],
    );

    if (!orderResult.rows.length) {
      return response.status(404).json({ error: "Order not found." });
    }

    const order = orderResult.rows[0];

    await activePool.query(
      "update orders set payment_status = $1 where id = $2",
      ["authorized", order.id],
    );

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
          payeeName: UPI_NAME
        })
      ],
    );

    response.json({
      success: true,
      redirectTo: `/success.html?orderId=${encodeURIComponent(publicId)}`
    });
  } catch (error) {
    response
      .status(400)
      .json({ error: formatError(error, "Unable to confirm your payment submission.") });
  }
});

app.get("/api/orders/:publicId", async (request, response) => {
  try {
    const order = await getOrderByPublicId(request.params.publicId);

    if (!order) {
      return response.status(404).json({ error: "Order not found." });
    }

    response.json({ order });
  } catch (error) {
    response.status(400).json({ error: formatError(error, "Unable to load order.") });
  }
});

app.get("/api/admin/orders", async (request, response) => {
  try {
    requireAdmin(request);
    const orders = await listRecentOrders();
    response.json({ orders });
  } catch (error) {
    response
      .status(error?.statusCode || 400)
      .json({ error: formatError(error, "Unable to load admin orders.") });
  }
});

app.patch("/api/admin/orders/:publicId", async (request, response) => {
  const allowedStatuses = new Set(["pending", "paid", "preparing", "ready", "completed"]);

  try {
    requireAdmin(request);

    if (!allowedStatuses.has(request.body.status)) {
      return response.status(400).json({ error: "Invalid order status." });
    }

    if (!pool) {
      const order = demoOrders.find((entry) => entry.public_id === request.params.publicId);

      if (!order) {
        return response.status(404).json({ error: "Order not found." });
      }

      order.status = request.body.status;
      if (request.body.status === "paid") {
        order.payment_status = "captured";
        if (order.payment_meta) {
          order.payment_meta.status = "captured";
        }
      }

      return response.json({ success: true });
    }

    const nextStatus = request.body.status;

    await pool.query(
      "update orders set status = $1, payment_status = case when $1 = 'paid' then 'captured' else payment_status end where public_id = $2",
      [nextStatus, request.params.publicId],
    );

    if (nextStatus === "paid") {
      const orderResult = await pool.query(
        "select id from orders where public_id = $1 limit 1",
        [request.params.publicId],
      );

      if (orderResult.rows.length) {
        await pool.query(
          "update payments set status = 'captured' where order_id = $1 and status = 'authorized'",
          [orderResult.rows[0].id],
        );
      }
    }

    response.json({ success: true });
  } catch (error) {
    response
      .status(error?.statusCode || 400)
      .json({ error: formatError(error, "Unable to update order status.") });
  }
});

function sendPublicFile(response, fileName) {
  response.sendFile(path.resolve(__dirname, fileName));
}

app.get("/", (request, response) => {
  sendPublicFile(response, "index.html");
});

app.get("/index.html", (request, response) => {
  sendPublicFile(response, "index.html");
});

app.get("/success.html", (request, response) => {
  sendPublicFile(response, "success.html");
});

app.get("/admin.html", (request, response) => {
  sendPublicFile(response, "admin.html");
});

app.get("/styles.css", (request, response) => {
  sendPublicFile(response, "styles.css");
});

app.get("/script.js", (request, response) => {
  sendPublicFile(response, "script.js");
});

app.get("/success.js", (request, response) => {
  sendPublicFile(response, "success.js");
});

app.get("/admin.js", (request, response) => {
  sendPublicFile(response, "admin.js");
});

app.use((request, response) => {
  if (request.path.startsWith("/api/")) {
    return response.status(404).json({ error: "API route not found." });
  }

  sendPublicFile(response, "index.html");
});

app.listen(PORT, () => {
  console.log(`${APP_NAME} server running on http://localhost:${PORT}`);
  console.log(`UPI payment mode enabled for ${UPI_ID}`);

  if (!HAS_DATABASE) {
    console.log("Running without DATABASE_URL. Orders stay in memory for local demo use.");
  }

  if (DEFAULT_ADMIN_ACCESS_KEY && !process.env.ADMIN_ACCESS_KEY) {
    console.log(`Using default local admin key: ${DEFAULT_ADMIN_ACCESS_KEY}`);
  }
});
