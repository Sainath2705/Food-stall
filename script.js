const state = {
  appName: "Stall 42",
  categories: [],
  activeCategory: "all",
  cart: [],
  checkoutBusy: false,
  pendingOrder: null,
  paymentConfig: null,
  selectedPaymentApp: "gpay"
};

const elements = {
  heroCheckoutButton: document.getElementById("heroCheckoutButton"),
  heroStatusChip: document.getElementById("heroStatusChip"),
  featuredName: document.getElementById("featuredName"),
  featuredDescription: document.getElementById("featuredDescription"),
  featuredPrice: document.getElementById("featuredPrice"),
  featuredMedia: document.getElementById("featuredMedia"),
  featuredAddButton: document.getElementById("featuredAddButton"),
  categoryTabs: document.getElementById("categoryTabs"),
  menuGrid: document.getElementById("menuGrid"),
  cartLines: document.getElementById("cartLines"),
  cartCountPill: document.getElementById("cartCountPill"),
  cartTotal: document.getElementById("cartTotal"),
  checkoutButton: document.getElementById("checkoutButton"),
  mobileCartBar: document.getElementById("mobileCartBar"),
  mobileCartTotal: document.getElementById("mobileCartTotal"),
  mobileCheckoutButton: document.getElementById("mobileCheckoutButton"),
  checkoutModal: document.getElementById("checkoutModal"),
  closeModalButton: document.getElementById("closeModalButton"),
  customerName: document.getElementById("customerName"),
  customerPhone: document.getElementById("customerPhone"),
  customerNotes: document.getElementById("customerNotes"),
  checkoutSummaryLines: document.getElementById("checkoutSummaryLines"),
  checkoutTotal: document.getElementById("checkoutTotal"),
  payNowButton: document.getElementById("payNowButton"),
  paymentStep: document.getElementById("paymentStep"),
  upiAmountValue: document.getElementById("upiAmountValue"),
  orderTokenValue: document.getElementById("orderTokenValue"),
  upiIdValue: document.getElementById("upiIdValue"),
  upiNameValue: document.getElementById("upiNameValue"),
  copyUpiButton: document.getElementById("copyUpiButton"),
  gpayQrImage: document.getElementById("gpayQrImage"),
  phonepeQrImage: document.getElementById("phonepeQrImage"),
  gpayOpenButton: document.getElementById("gpayOpenButton"),
  phonepeOpenButton: document.getElementById("phonepeOpenButton"),
  paymentReferenceInput: document.getElementById("paymentReferenceInput"),
  confirmPaymentButton: document.getElementById("confirmPaymentButton"),
  toast: document.getElementById("toast")
};

function formatCurrency(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(paise || 0) / 100);
}

function glyphForItem(slug) {
  if (slug.includes("tea")) return "TEA";
  if (slug.includes("coffee")) return "CAF";
  if (slug.includes("coke")) return "POP";
  if (slug.includes("omelette")) return "EGG";
  if (slug.includes("maggi")) return "HOT";
  return "BITE";
}

function getAllItems() {
  return state.categories.flatMap((category) => category.items || []);
}

function getItem(itemId) {
  return getAllItems().find((item) => item.id === itemId);
}

function getFeaturedItem() {
  return getAllItems().find((item) => item.is_featured) || getAllItems()[0] || null;
}

function getVisibleItems() {
  if (state.activeCategory === "all") {
    return getAllItems();
  }

  return state.categories.find((category) => category.slug === state.activeCategory)?.items || [];
}

function getCartLine(itemId) {
  return state.cart.find((line) => line.itemId === itemId);
}

function getCartCount() {
  return state.cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

function getCartTotal() {
  return state.cart.reduce((sum, line) => {
    const item = getItem(line.itemId);
    return sum + Number(item?.price_paise || 0) * Number(line.quantity || 0);
  }, 0);
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

function setCheckoutBusy(isBusy, buttonText) {
  state.checkoutBusy = isBusy;
  elements.payNowButton.disabled = isBusy;
  elements.confirmPaymentButton.disabled = isBusy;

  if (buttonText) {
    elements.payNowButton.textContent = buttonText;
  } else {
    elements.payNowButton.textContent = "Create Order & Show QR";
  }

  elements.confirmPaymentButton.textContent = isBusy ? "Submitting..." : "I Have Paid";
}

function updateQuantity(itemId, quantity) {
  const normalizedQuantity = Math.max(0, Number(quantity || 0));
  const existingLine = getCartLine(itemId);

  if (!existingLine && normalizedQuantity > 0) {
    state.cart.push({ itemId, quantity: normalizedQuantity });
  } else if (existingLine) {
    existingLine.quantity = normalizedQuantity;
    if (existingLine.quantity <= 0) {
      state.cart = state.cart.filter((line) => line.itemId !== itemId);
    }
  }

  render();
}

function addItem(itemId) {
  const existingLine = getCartLine(itemId);
  updateQuantity(itemId, Number(existingLine?.quantity || 0) + 1);
}

function openCheckoutModal() {
  if (!state.cart.length) {
    showToast("Add at least one item before checking out.", "error");
    return;
  }

  elements.checkoutModal.classList.remove("hidden");
}

function closeCheckoutModal() {
  if (state.checkoutBusy) {
    return;
  }

  elements.checkoutModal.classList.add("hidden");
}

function resetPaymentStep() {
  state.pendingOrder = null;
  state.paymentConfig = null;
  state.selectedPaymentApp = "gpay";
  elements.paymentStep.classList.add("hidden");
  elements.paymentReferenceInput.value = "";
  elements.gpayOpenButton.classList.remove("selected");
  elements.phonepeOpenButton.classList.remove("selected");
}

function renderFeatured() {
  const featuredItem = getFeaturedItem();

  if (!featuredItem) {
    return;
  }

  elements.featuredName.textContent = featuredItem.name;
  elements.featuredDescription.textContent = featuredItem.description;
  elements.featuredPrice.textContent = formatCurrency(featuredItem.price_paise);
  elements.featuredAddButton.onclick = () => addItem(featuredItem.id);

  if (featuredItem.image_url) {
    elements.featuredMedia.textContent = "";
    elements.featuredMedia.style.backgroundImage = `linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.22)), url('${featuredItem.image_url}')`;
  } else {
    elements.featuredMedia.style.backgroundImage = "";
    elements.featuredMedia.textContent = glyphForItem(featuredItem.slug);
  }
}

function renderCategories() {
  const fragments = [
    {
      slug: "all",
      name: "All Items"
    },
    ...state.categories.map((category) => ({
      slug: category.slug,
      name: category.name
    }))
  ]
    .map(
      (category) => `
        <button
          class="category-button ${state.activeCategory === category.slug ? "active" : ""}"
          type="button"
          data-category="${category.slug}"
        >
          ${category.name}
        </button>
      `,
    )
    .join("");

  elements.categoryTabs.innerHTML = fragments;

  elements.categoryTabs.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      render();
    });
  });
}

function renderMenu() {
  const visibleItems = getVisibleItems();

  if (!visibleItems.length) {
    elements.menuGrid.innerHTML = `
      <div class="empty-state">
        No items are available right now. Try another category.
      </div>
    `;
    return;
  }

  elements.menuGrid.innerHTML = visibleItems
    .map((item) => {
      const line = getCartLine(item.id);
      const quantity = Number(line?.quantity || 0);
      const mediaStyle = item.image_url
        ? `style="background-image: url('${item.image_url}'); color: transparent;"`
        : "";

      return `
        <article class="menu-card">
          <div class="menu-media" ${mediaStyle}>${item.image_url ? "" : glyphForItem(item.slug)}</div>
          <div>
            <div class="meta-row">
              <h3>${item.name}</h3>
              ${item.is_featured ? '<span class="badge">Bestseller</span>' : ""}
            </div>
            <p>${item.description}</p>
            <div class="meta-row">
              <span class="price-tag">${formatCurrency(item.price_paise)}</span>
              <span class="price-tag">${item.prep_time_mins} min prep</span>
            </div>
          </div>
          <div class="item-actions">
            ${
              quantity > 0
                ? `
                  <div class="qty-control">
                    <button type="button" data-dec="${item.id}">-</button>
                    <strong>${quantity}</strong>
                    <button type="button" data-inc="${item.id}">+</button>
                  </div>
                `
                : `
                  <button class="primary-button" type="button" data-add="${item.id}">
                    Add
                  </button>
                `
            }
          </div>
        </article>
      `;
    })
    .join("");

  elements.menuGrid.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addItem(button.dataset.add));
  });

  elements.menuGrid.querySelectorAll("[data-inc]").forEach((button) => {
    button.addEventListener("click", () => {
      const line = getCartLine(button.dataset.inc);
      updateQuantity(button.dataset.inc, Number(line?.quantity || 0) + 1);
    });
  });

  elements.menuGrid.querySelectorAll("[data-dec]").forEach((button) => {
    button.addEventListener("click", () => {
      const line = getCartLine(button.dataset.dec);
      updateQuantity(button.dataset.dec, Number(line?.quantity || 0) - 1);
    });
  });
}

function renderCart() {
  const total = getCartTotal();
  const itemCount = getCartCount();

  elements.cartCountPill.textContent = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
  elements.cartTotal.textContent = formatCurrency(total);
  elements.checkoutTotal.textContent = formatCurrency(total);
  elements.mobileCartTotal.textContent = formatCurrency(total);

  if (!state.cart.length) {
    elements.cartLines.innerHTML = `
      <div class="empty-state">Add items from the menu to build your order.</div>
    `;
    elements.checkoutSummaryLines.innerHTML = `
      <div class="empty-state">Your selected items will appear here.</div>
    `;
    elements.mobileCartBar.classList.add("hidden");
    return;
  }

  elements.mobileCartBar.classList.remove("hidden");

  const linesMarkup = state.cart
    .map((line) => {
      const item = getItem(line.itemId);
      if (!item) {
        return "";
      }

      return `
        <div class="cart-line">
          <div>
            <strong>${item.name}</strong>
            <small>Qty ${line.quantity}</small>
          </div>
          <div>
            <strong>${formatCurrency(item.price_paise * line.quantity)}</strong>
            <small>${formatCurrency(item.price_paise)} each</small>
          </div>
        </div>
      `;
    })
    .join("");

  elements.cartLines.innerHTML = linesMarkup;
  elements.checkoutSummaryLines.innerHTML = linesMarkup.replaceAll("cart-line", "summary-line");
}

function renderPaymentStep() {
  if (!state.pendingOrder || !state.paymentConfig) {
    elements.paymentStep.classList.add("hidden");
    return;
  }

  elements.paymentStep.classList.remove("hidden");
  elements.upiAmountValue.textContent = formatCurrency(state.pendingOrder.amountPaise);
  elements.orderTokenValue.textContent = state.pendingOrder.publicId;
  elements.upiIdValue.textContent = state.paymentConfig.upiId;
  elements.upiNameValue.textContent = state.paymentConfig.payeeName;
  elements.gpayQrImage.src = state.paymentConfig.gpayQrUrl;
  elements.phonepeQrImage.src = state.paymentConfig.phonepeQrUrl;
  elements.gpayOpenButton.classList.add("selected");
  elements.phonepeOpenButton.classList.remove("selected");
}

function render() {
  renderFeatured();
  renderCategories();
  renderMenu();
  renderCart();
  renderPaymentStep();
}

async function loadMenu() {
  try {
    const response = await fetch("/api/menu");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to load menu.");
    }

    state.appName = result.appName || "Stall 42";
    state.categories = result.categories || [];
    document.title = `${state.appName} | Campus Ordering`;
    document.querySelector(".brand").textContent = state.appName;
    elements.heroStatusChip.textContent = `UPI payments to ${result.payment?.upiId || "your UPI ID"}`;
    render();
  } catch (error) {
    elements.heroStatusChip.textContent = "Menu unavailable";
    showToast(error.message || "Unable to load menu.", "error");
  }
}

async function startCheckout() {
  if (state.checkoutBusy) {
    return;
  }

  if (state.pendingOrder && state.paymentConfig) {
    showToast("Order already created. Complete the UPI payment below.");
    renderPaymentStep();
    return;
  }

  try {
    setCheckoutBusy(true, "Creating order...");

    const payload = {
      customerName: elements.customerName.value,
      customerPhone: elements.customerPhone.value,
      notes: elements.customerNotes.value,
      items: state.cart
    };

    const checkoutResponse = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const checkoutResult = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
      throw new Error(checkoutResult.error || "Unable to start checkout.");
    }

    state.pendingOrder = checkoutResult.order;
    state.paymentConfig = checkoutResult.payment;
    state.selectedPaymentApp = "gpay";
    renderPaymentStep();
    showToast("Order created. Pay with one of the QR cards below.");
  } catch (error) {
    showToast(error.message || "Unable to start checkout.", "error");
  } finally {
    setCheckoutBusy(false);
  }
}

function openSelectedUpiApp(paymentApp) {
  if (!state.paymentConfig?.upiLink) {
    showToast("Create the order first to generate the payment link.", "error");
    return;
  }

  state.selectedPaymentApp = paymentApp;
  elements.gpayOpenButton.classList.toggle("selected", paymentApp === "gpay");
  elements.phonepeOpenButton.classList.toggle("selected", paymentApp === "phonepe");
  window.location.href = state.paymentConfig.upiLink;
}

async function copyUpiId() {
  try {
    await navigator.clipboard.writeText(elements.upiIdValue.textContent.trim());
    showToast("UPI ID copied.");
  } catch (error) {
    showToast("Could not copy the UPI ID automatically.", "error");
  }
}

async function confirmPaymentSubmission() {
  if (!state.pendingOrder?.publicId) {
    showToast("Create the order before submitting payment.", "error");
    return;
  }

  try {
    setCheckoutBusy(true);

    const response = await fetch(
      `/api/orders/${encodeURIComponent(state.pendingOrder.publicId)}/confirm-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paymentApp: state.selectedPaymentApp,
          paymentReference: elements.paymentReferenceInput.value.trim()
        })
      },
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to confirm payment submission.");
    }

    state.cart = [];
    window.location.href = result.redirectTo;
  } catch (error) {
    showToast(error.message || "Unable to confirm payment.", "error");
    setCheckoutBusy(false);
  }
}

function attachEvents() {
  elements.heroCheckoutButton.addEventListener("click", openCheckoutModal);
  elements.checkoutButton.addEventListener("click", openCheckoutModal);
  elements.mobileCheckoutButton.addEventListener("click", openCheckoutModal);
  elements.closeModalButton.addEventListener("click", closeCheckoutModal);
  elements.payNowButton.addEventListener("click", startCheckout);
  elements.copyUpiButton.addEventListener("click", copyUpiId);
  elements.confirmPaymentButton.addEventListener("click", confirmPaymentSubmission);
  elements.gpayOpenButton.addEventListener("click", () => openSelectedUpiApp("gpay"));
  elements.phonepeOpenButton.addEventListener("click", () => openSelectedUpiApp("phonepe"));

  document.addEventListener("click", (event) => {
    if (event.target?.dataset?.closeModal === "true") {
      closeCheckoutModal();
    }
  });
}

attachEvents();
loadMenu();
