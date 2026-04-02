const elements = {
  adminKeyInput: document.getElementById("adminKeyInput"),
  connectAdminButton: document.getElementById("connectAdminButton"),
  clearAdminButton: document.getElementById("clearAdminButton"),
  metricTotalOrders: document.getElementById("metricTotalOrders"),
  metricActiveOrders: document.getElementById("metricActiveOrders"),
  metricSyncState: document.getElementById("metricSyncState"),
  adminOrdersGrid: document.getElementById("adminOrdersGrid"),
  toast: document.getElementById("toast")
};

const state = {
  accessKey: window.localStorage.getItem("stall42-admin-key") || "",
  refreshTimer: null
};

const statuses = ["pending", "paid", "preparing", "ready", "completed"];

function formatCurrency(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(paise || 0) / 100);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function showToast(message, variant = "default") {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${variant === "error" ? "error" : ""}`;
  elements.toast.classList.remove("hidden");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 3200);
}

function updateSyncState(text) {
  elements.metricSyncState.textContent = text;
}

async function fetchOrders() {
  if (!state.accessKey) {
    return;
  }

  try {
    updateSyncState("Loading");
    const response = await fetch("/api/admin/orders", {
      headers: {
        "x-admin-key": state.accessKey
      }
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to load orders.");
    }

    renderOrders(result.orders || []);
    updateSyncState("Live");
  } catch (error) {
    updateSyncState("Error");
    showToast(error.message || "Unable to load orders.", "error");
  }
}

function connectDashboard() {
  const accessKey = elements.adminKeyInput.value.trim();

  if (!accessKey) {
    showToast("Enter the admin key first.", "error");
    return;
  }

  state.accessKey = accessKey;
  window.localStorage.setItem("stall42-admin-key", accessKey);
  fetchOrders();

  if (state.refreshTimer) {
    window.clearInterval(state.refreshTimer);
  }

  state.refreshTimer = window.setInterval(fetchOrders, 15000);
}

function clearDashboard() {
  state.accessKey = "";
  window.localStorage.removeItem("stall42-admin-key");
  elements.adminKeyInput.value = "";
  elements.adminOrdersGrid.innerHTML = `
    <div class="empty-state">
      Connect with the admin key to start monitoring live stall orders.
    </div>
  `;
  elements.metricTotalOrders.textContent = "0";
  elements.metricActiveOrders.textContent = "0";
  updateSyncState("Waiting");

  if (state.refreshTimer) {
    window.clearInterval(state.refreshTimer);
  }
}

async function updateStatus(publicId, status) {
  try {
    updateSyncState("Updating");
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(publicId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": state.accessKey
      },
      body: JSON.stringify({ status })
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to update order.");
    }

    fetchOrders();
  } catch (error) {
    updateSyncState("Error");
    showToast(error.message || "Unable to update order.", "error");
  }
}

function paymentSummary(order) {
  const lines = [];

  if (order.payment_status) {
    lines.push(`Payment status: ${order.payment_status}`);
  }

  if (order.payment_meta?.app) {
    lines.push(`App: ${order.payment_meta.app}`);
  }

  if (order.payment_meta?.reference) {
    lines.push(`Ref: ${order.payment_meta.reference}`);
  }

  return lines.join(" • ");
}

function renderOrders(orders) {
  const activeOrders = orders.filter((order) => order.status !== "completed").length;
  elements.metricTotalOrders.textContent = String(orders.length);
  elements.metricActiveOrders.textContent = String(activeOrders);

  if (!orders.length) {
    elements.adminOrdersGrid.innerHTML = `
      <div class="empty-state">No orders yet. Submitted orders will appear here automatically.</div>
    `;
    return;
  }

  elements.adminOrdersGrid.innerHTML = orders
    .map(
      (order) => `
        <article class="order-card">
          <div class="cart-head">
            <div>
              <p class="eyebrow">${order.public_id}</p>
              <h3>${order.customer_name}</h3>
              <p class="hero-text" style="font-size: 14px; margin-top: 8px;">${order.customer_phone}</p>
            </div>
            <div style="text-align:right;">
              <strong style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px;">${formatCurrency(order.subtotal_paise)}</strong>
              <p class="hero-text" style="font-size: 13px; margin-top: 8px;">${formatTime(order.created_at)}</p>
            </div>
          </div>

          <div class="empty-state" style="margin-top: 16px;">
            ${paymentSummary(order) || "Waiting for customer payment submission."}
          </div>

          <div class="summary-lines">
            ${order.order_items
              .map(
                (line) => `
                  <div class="summary-line">
                    <div>
                      <strong>${line.item_name}</strong>
                      <small>Qty ${line.quantity}</small>
                    </div>
                    <div>
                      <strong>${formatCurrency(line.unit_price_paise * line.quantity)}</strong>
                    </div>
                  </div>
                `,
              )
              .join("")}
          </div>

          ${
            order.notes
              ? `<div class="empty-state" style="margin-top: 16px;">Note: ${order.notes}</div>`
              : ""
          }

          <div class="status-chip-row">
            ${statuses
              .map(
                (status) => `
                  <button
                    class="category-button ${order.status === status ? "active" : ""}"
                    type="button"
                    data-public-id="${order.public_id}"
                    data-status="${status}"
                  >
                    ${status}
                  </button>
                `,
              )
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");

  elements.adminOrdersGrid.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      updateStatus(button.dataset.publicId, button.dataset.status);
    });
  });
}

elements.connectAdminButton.addEventListener("click", connectDashboard);
elements.clearAdminButton.addEventListener("click", clearDashboard);

if (state.accessKey) {
  elements.adminKeyInput.value = state.accessKey;
  connectDashboard();
}
