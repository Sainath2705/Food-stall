const params = new URLSearchParams(window.location.search);
const orderId = params.get("orderId");

const elements = {
  successStatusChip: document.getElementById("successStatusChip"),
  successToken: document.getElementById("successToken"),
  successHeading: document.getElementById("successHeading"),
  successSubtext: document.getElementById("successSubtext"),
  successWaitTime: document.getElementById("successWaitTime"),
  successOrderLines: document.getElementById("successOrderLines"),
  successTotal: document.getElementById("successTotal"),
  successPaymentHeadline: document.getElementById("successPaymentHeadline"),
  paymentMetaText: document.getElementById("paymentMetaText")
};

function formatCurrency(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(paise || 0) / 100);
}

function waitTimeLabel(estimatedReadyAt) {
  if (!estimatedReadyAt) {
    return "10 mins";
  }

  const difference = Math.max(
    1,
    Math.round((new Date(estimatedReadyAt).getTime() - Date.now()) / 60000),
  );

  return `${difference} mins`;
}

function paymentCopy(order) {
  if (order.payment_status === "captured") {
    return {
      chip: "Payment confirmed",
      heading: "Payment confirmed",
      text: "The stall has confirmed your UPI payment."
    };
  }

  if (order.payment_status === "authorized") {
    return {
      chip: "Payment submitted",
      heading: "Waiting for confirmation",
      text: "Your payment was submitted. The stall team will confirm it shortly."
    };
  }

  return {
    chip: "Order created",
    heading: "Payment pending",
    text: "Open the UPI payment step again if you still need to pay."
  };
}

async function loadOrder() {
  if (!orderId) {
    elements.successStatusChip.textContent = "Token unavailable";
    elements.successOrderLines.innerHTML = `
      <div class="empty-state">The order token is missing from the URL.</div>
    `;
    return;
  }

  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to load order details.");
    }

    const { order } = result;
    const paymentState = paymentCopy(order);

    elements.successStatusChip.textContent = paymentState.chip;
    elements.successToken.textContent = order.public_id;
    elements.successHeading.textContent = `Order ${order.public_id}`;
    elements.successSubtext.textContent = `${order.customer_name}, ${paymentState.text}`;
    elements.successWaitTime.textContent = waitTimeLabel(order.estimated_ready_at);
    elements.successTotal.textContent = formatCurrency(order.subtotal_paise);
    elements.successPaymentHeadline.textContent = paymentState.heading;

    if (order.payment_meta?.app || order.payment_meta?.reference) {
      const details = [
        order.payment_meta.app ? `App: ${order.payment_meta.app}` : null,
        order.payment_meta.reference ? `Ref: ${order.payment_meta.reference}` : null
      ]
        .filter(Boolean)
        .join(" • ");

      elements.paymentMetaText.textContent = details || paymentState.text;
    } else {
      elements.paymentMetaText.textContent = paymentState.text;
    }

    elements.successOrderLines.innerHTML = order.order_items
      .map(
        (line) => `
          <article class="menu-card">
            <div class="menu-media">HOT</div>
            <div>
              <h3>${line.item_name}</h3>
              <p>Quantity ${line.quantity}</p>
            </div>
            <div class="item-actions">
              <span class="price-tag">${formatCurrency(line.unit_price_paise * line.quantity)}</span>
            </div>
          </article>
        `,
      )
      .join("");
  } catch (error) {
    elements.successStatusChip.textContent = "Order unavailable";
    elements.successOrderLines.innerHTML = `
      <div class="empty-state">${error.message || "Unable to load order details."}</div>
    `;
  }
}

loadOrder();
