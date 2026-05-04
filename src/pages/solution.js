import { html } from "lit-html";
import { loadData } from "../dataLoader.js";
import { validateEmail } from "../api/emailApi.js";

/**
 * Solution Page
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_ALLOWED_CHARS_PATTERN = /^\+?[0-9\s()-]+$/;
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DEFAULT_BANNER = {
    title: "Profesionálne náradie pre každý projekt",
    description: "Objavte ponuku overených produktov a vyberte si riešenie presne podľa vašich potrieb.",
    ctaText: "Zobraziť produkty",
};

const DEFAULT_CTA_BANNER = {
    title: "Získajte tajnú ponuku",
    description: "Vyplňte krátky formulár a pripravíme pre vás špeciálnu ponuku na mieru.",
    ctaText: "Získať tajnú ponuku",
};

const getStringValue = (value, fallback = "") => {
    if (typeof value !== "string") {
        return fallback;
    }

    const normalizedValue = value.trim();
    return normalizedValue || fallback;
};

const getArrayValue = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value;
};

const toSafeNumber = (value, fallback = 0) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return fallback;
    }

    return numericValue;
};

const getSafeHref = (value) => {
    const href = getStringValue(value);

    if (!href || href === "#") {
        return null;
    }

    return href;
};

const getFocusableElements = (container) => {
    if (!container) {
        return [];
    }

    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getAttribute("aria-hidden") !== "true"
    );
};

const renderEmptyState = (title, message) => html`
    <section class="c-empty-state" aria-live="polite">
        <h2 class="c-empty-state__title">${title}</h2>
        <p class="c-empty-state__message">${message}</p>
    </section>
`;

const setFieldError = (formElement, fieldName, message) => {
    const field = formElement.querySelector(`[name="${fieldName}"]`);
    const errorElement = formElement.querySelector(`[data-field-error="${fieldName}"]`);

    if (!field || !errorElement) {
        return;
    }

    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", `${fieldName}-error`);
    errorElement.textContent = message;
};

const clearFieldErrors = (formElement) => {
    formElement.querySelectorAll(".is-invalid").forEach((field) => {
        field.classList.remove("is-invalid");
        field.setAttribute("aria-invalid", "false");
        field.removeAttribute("aria-describedby");
    });

    formElement.querySelectorAll("[data-field-error]").forEach((errorElement) => {
        errorElement.textContent = "";
    });
};

const setSecretOfferSubmitDefaultLabel = (submitButton) => {
    if (!submitButton) {
        return;
    }

    submitButton.innerHTML = `
        <span class="c-secret-offer-modal__submit-text">Získať tajnú ponuku</span>
        <svg
            class="c-secret-offer-modal__submit-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M4.16663 10H15.8333M15.8333 10L9.99996 4.16669M15.8333 10L9.99996 15.8334"
                stroke="currentColor"
                stroke-width="1.67"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    `;
};

const validateFormData = (formData) => {
    const errors = {};
    const email = formData.get("email")?.trim() || "";
    const fullName = formData.get("fullName")?.trim() || "";
    const phone = formData.get("phone")?.trim() || "";
    const source = formData.get("source")?.trim() || "";

    if (!email) {
        errors.email = "Email je povinný.";
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = "Zadajte email v správnom formáte.";
    }

    if (!fullName) {
        errors.fullName = "Meno a priezvisko je povinné.";
    }

    if (!phone) {
        errors.phone = "Telefónne číslo je povinné.";
    } else {
        const phoneDigits = phone.replace(/\D/g, "");

        if (!PHONE_ALLOWED_CHARS_PATTERN.test(phone) || phoneDigits.length < 9 || phoneDigits.length > 15) {
            errors.phone = "Zadajte telefónne číslo v správnom formáte.";
        }
    }

    if (!source) {
        errors.source = "Toto pole je povinné.";
    }

    return errors;
};

const closeSecretOfferModal = (modalElement) => {
    if (!modalElement) {
        return;
    }

    if (typeof modalElement.__cleanupHandlers === "function") {
        modalElement.__cleanupHandlers();
        modalElement.__cleanupHandlers = null;
    }

    modalElement.classList.remove("is-open");

    window.setTimeout(() => {
        if (document.body.contains(modalElement)) {
            modalElement.remove();
        }

        document.body.classList.remove("is-modal-open");

        if (modalElement.__returnFocusTo instanceof HTMLElement) {
            modalElement.__returnFocusTo.focus();
        }
    }, 220);
};

const renderSuccessState = (modalElement) => {
    const contentElement = modalElement.querySelector('[data-role="secret-offer-content"]');
    if (!contentElement) {
        return;
    }

    contentElement.innerHTML = `
        <div class="c-secret-offer-modal__success">
            <div class="c-secret-offer-modal__success-icon" aria-hidden="true">✓</div>
            <h3 class="c-secret-offer-modal__success-title">Ďakujeme za záujem</h3>
            <p class="c-secret-offer-modal__success-text">
                Formulár bol úspešne odoslaný. Čoskoro vás budeme kontaktovať so špeciálnou ponukou.
            </p>
            <button type="button" class="c-secret-offer-modal__success-close" data-role="secret-offer-close-success">
                Zavrieť
            </button>
        </div>
    `;

    const closeButton = contentElement.querySelector('[data-role="secret-offer-close-success"]');
    closeButton?.addEventListener("click", () => closeSecretOfferModal(modalElement));
};

const bindSecretOfferForm = (modalElement) => {
    const formElement = modalElement.querySelector('[data-role="secret-offer-form"]');
    const submitButton = modalElement.querySelector('[data-role="secret-offer-submit"]');

    if (!formElement || !submitButton) {
        return;
    }

    formElement.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearFieldErrors(formElement);

        const formData = new FormData(formElement);
        const errors = validateFormData(formData);

        Object.entries(errors).forEach(([fieldName, message]) => {
            setFieldError(formElement, fieldName, message);
        });

        if (Object.keys(errors).length > 0) {
            const firstInvalidField = formElement.querySelector(".is-invalid");
            firstInvalidField?.focus();
            return;
        }

        const email = formData.get("email")?.trim() || "";
        submitButton.disabled = true;
        submitButton.textContent = "Overujem...";

        const emailValidation = await validateEmail(email);

        if (!emailValidation?.success) {
            setFieldError(
                formElement,
                "email",
                emailValidation?.message || "Email sa nepodarilo overiť. Skúste to prosím znova."
            );
            submitButton.disabled = false;
            setSecretOfferSubmitDefaultLabel(submitButton);
            return;
        }

        submitButton.textContent = "Odosielam...";

        window.setTimeout(() => {
            renderSuccessState(modalElement);
        }, 250);
    });
};

const createSecretOfferModal = () => {
    const existingModal = document.querySelector('[data-role="secret-offer-modal"]');
    if (existingModal) {
        document.body.classList.add("is-modal-open");
        existingModal.classList.add("is-open");

        const firstFocusableElement = getFocusableElements(existingModal)[0];
        firstFocusableElement?.focus();

        return existingModal;
    }

    const modalElement = document.createElement("div");
    modalElement.className = "c-secret-offer-modal";
    modalElement.setAttribute("data-role", "secret-offer-modal");
    modalElement.__returnFocusTo = document.activeElement;

    modalElement.innerHTML = `
        <div class="c-secret-offer-modal__overlay" data-role="secret-offer-overlay"></div>
        <div
            class="c-secret-offer-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="secret-offer-title"
            tabindex="-1"
        >
            <button
                class="c-secret-offer-modal__close"
                type="button"
                aria-label="Zavrieť modal"
                data-role="secret-offer-close"
            >
                ×
            </button>
            <div data-role="secret-offer-content">
                <div class="c-secret-offer-modal__header">
                    <h3 class="c-secret-offer-modal__title" id="secret-offer-title">Tajná ponuka produktov Dewalt len pre vás</h3>
                    <p class="c-secret-offer-modal__subtitle">
                        <span class="c-secret-offer-modal__required">*</span> povinné polia
                    </p>
                </div>

                <form class="c-secret-offer-modal__form" data-role="secret-offer-form" novalidate>
                    <label class="c-secret-offer-modal__field">
                        <span>Email <span class="c-secret-offer-modal__required">*</span></span>
                        <input type="email" name="email" placeholder="mail@riesenia.com" autocomplete="email" required />
                        <span class="c-secret-offer-modal__error" id="email-error" data-field-error="email" aria-live="polite"></span>
                    </label>

                    <div class="c-secret-offer-modal__row">
                        <label class="c-secret-offer-modal__field">
                            <span>Meno a priezvisko <span class="c-secret-offer-modal__required">*</span></span>
                            <input type="text" name="fullName" placeholder="Tomáš Jedno" autocomplete="name" required />
                            <span class="c-secret-offer-modal__error" id="fullName-error" data-field-error="fullName" aria-live="polite"></span>
                        </label>

                        <label class="c-secret-offer-modal__field">
                            <span>Telefónne číslo <span class="c-secret-offer-modal__required">*</span></span>
                            <input type="tel" name="phone" placeholder="+421 900 000 000" autocomplete="tel" required />
                            <span class="c-secret-offer-modal__error" id="phone-error" data-field-error="phone" aria-live="polite"></span>
                        </label>
                    </div>

                    <label class="c-secret-offer-modal__field">
                        <span>Odkiaľ ste sa o ponuke dozvedeli? <span class="c-secret-offer-modal__required">*</span></span>
                        <select name="source" required>
                            <option value="">Vyberte možnosť</option>
                            <option value="direct">Priamo z našej stránky</option>
                            <option value="google">Google</option>
                            <option value="social">Sociálne siete</option>
                            <option value="friend">Odporúčanie od známeho</option>
                            <option value="other">Iné</option>
                        </select>
                        <span class="c-secret-offer-modal__error" id="source-error" data-field-error="source" aria-live="polite"></span>
                    </label>

                    <div class="c-secret-offer-modal__actions-row">
                        <button type="submit" class="c-secret-offer-modal__submit" data-role="secret-offer-submit">
                            <span class="c-secret-offer-modal__submit-text">Získať tajnú ponuku</span>
                            <svg
                                class="c-secret-offer-modal__submit-icon"
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                aria-hidden="true"
                                focusable="false"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M4.16663 10H15.8333M15.8333 10L9.99996 4.16669M15.8333 10L9.99996 15.8334"
                                    stroke="currentColor"
                                    stroke-width="1.67"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </button>

                        <p class="c-secret-offer-modal__terms-copy">
                            Odoslaním formuláru súhlasíte so
                            <a
                                class="c-secret-offer-modal__terms"
                                href="https://www.riesenia.com"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                spracovaním osobných údajov
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.append(modalElement);
    document.body.classList.add("is-modal-open");

    const closeButton = modalElement.querySelector('[data-role="secret-offer-close"]');
    const overlay = modalElement.querySelector('[data-role="secret-offer-overlay"]');
    const dialogElement = modalElement.querySelector('[role="dialog"]');

    const handleModalKeydown = (event) => {
        if (!document.body.contains(modalElement) || !modalElement.classList.contains("is-open")) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeSecretOfferModal(modalElement);
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const focusableElements = getFocusableElements(dialogElement);
        if (focusableElements.length === 0) {
            event.preventDefault();
            dialogElement?.focus();
            return;
        }

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;
        const isFocusOutsideDialog = !dialogElement?.contains(activeElement);

        if (event.shiftKey && (activeElement === firstFocusable || isFocusOutsideDialog)) {
            event.preventDefault();
            lastFocusable.focus();
            return;
        }

        if (!event.shiftKey && (activeElement === lastFocusable || isFocusOutsideDialog)) {
            event.preventDefault();
            firstFocusable.focus();
        }
    };

    modalElement.__cleanupHandlers = () => {
        document.removeEventListener("keydown", handleModalKeydown, true);
    };

    closeButton?.addEventListener("click", () => closeSecretOfferModal(modalElement));
    overlay?.addEventListener("click", () => closeSecretOfferModal(modalElement));
    document.addEventListener("keydown", handleModalKeydown, true);

    bindSecretOfferForm(modalElement);

    window.requestAnimationFrame(() => {
        modalElement.classList.add("is-open");
        document.body.classList.add("is-modal-open");

        const firstFocusableElement = getFocusableElements(dialogElement)[0];
        firstFocusableElement?.focus();
    });

    return modalElement;
};

// CTA button click handler
const handleCtaClick = () => {
    console.log("CTA button clicked");
    // TODO: Implement email form/modal
    createSecretOfferModal();
};

// Banner button click handler
const handleBannerClick = () => {
    console.log("Banner button clicked");
    // TODO: Navigate to products or filter
    scrollToProducts();
};

const scrollToProducts = () => {
    const productsSection = document.querySelector(".c-solution-content__products");
    const headerElement = document.querySelector(".l-page__header");
    const headerOffset = (headerElement?.getBoundingClientRect().height || 0) + 16;

    if (!productsSection) {
        return;
    }

    const targetPosition = Math.max(
        productsSection.getBoundingClientRect().top + window.scrollY - headerOffset,
        0
    );

    window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
    });
};



let cartNotificationTimeout;
const MAX_PRODUCT_QUANTITY = 10;
const BANNER_IMAGE_URL = new URL("../assets/images/banner/main-banner.jpg", import.meta.url).href;
const SECRET_OFFER_IMAGE_URL = new URL("../assets/images/tajna-ponuka.jpg", import.meta.url).href;
const PRODUCT_IMAGE_BY_ID = {
    1: new URL("../assets/images/products/porduct1.png", import.meta.url).href,
    2: new URL("../assets/images/products/product2.png", import.meta.url).href,
};
const DEFAULT_PRODUCT_IMAGE_URL = PRODUCT_IMAGE_BY_ID[1];
const DEFAULT_CATEGORY_IMAGE_URL = new URL("../assets/images/categories/prislusenstvo.jpg", import.meta.url).href;

const applyImageFallback = (event, fallbackSrc) => {
    const imageElement = event.currentTarget;
    if (!(imageElement instanceof HTMLImageElement) || !fallbackSrc) {
        return;
    }

    if (imageElement.src === fallbackSrc) {
        return;
    }

    imageElement.src = fallbackSrc;
};

const getProductImageUrl = (product) => {
    const productId = Number(product?.id);
    return PRODUCT_IMAGE_BY_ID[productId] || product?.imageUrl || DEFAULT_PRODUCT_IMAGE_URL;
};

const formatPrice = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return "-";
    }

    return new Intl.NumberFormat("sk-SK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue);
};

const formatPriceWithCurrency = (value, currency) => {
    const normalizedPrice = formatPrice(value);
    if (normalizedPrice === "-") {
        return normalizedPrice;
    }

    return `${normalizedPrice} ${getStringValue(currency, "EUR")}`;
};

const getBadgeClass = (type) => {
    if (type === "new") {
        return "is-new";
    }

    if (type === "discount") {
        return "is-discount";
    }

    return "is-default";
};

const formatQuantityLabel = (quantity) => {
    if (quantity === 1) {
        return "1 kus";
    }

    if (quantity >= 2 && quantity <= 4) {
        return `${quantity} kusy`;
    }

    return `${quantity} kusov`;
};

const formatAddedToCartVerb = (quantity) => {
    if (quantity === 1) {
        return "bol pridaný";
    }

    if (quantity >= 2 && quantity <= 4) {
        return "boli pridané";
    }

    return "bolo pridaných";
};

const showCartNotification = (type, message) => {
    const existingContainer = document.querySelector('[data-role="cart-notification-container"]');
    const container =
        existingContainer ||
        Object.assign(document.createElement("div"), {
            className: "c-cart-notifications",
        });

    if (!existingContainer) {
        container.setAttribute("data-role", "cart-notification-container");
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "true");
        document.body.append(container);
    }

    const notification = document.createElement("div");
    notification.className = `c-cart-notification is-${type}`;
    notification.innerHTML = `
        <div class="c-cart-notification__accent"></div>
        <div class="c-cart-notification__body">
            <div class="c-cart-notification__label">${type === "success" ? "Pridané do košíka" : "Upozornenie"}</div>
            <div class="c-cart-notification__message">${message}</div>
        </div>
    `;

    container.replaceChildren(notification);

    window.clearTimeout(cartNotificationTimeout);
    cartNotificationTimeout = window.setTimeout(() => {
        notification.classList.add("is-leaving");

        window.setTimeout(() => {
            if (container.contains(notification)) {
                notification.remove();
            }
        }, 220);
    }, 3200);
};

const changeQuantity = (event, quantity) => {
    const actionWrap = event.currentTarget.closest(".c-solution-product__actions");
    const quantityElement = actionWrap?.querySelector('[data-role="quantity-value"]');

    if (!quantityElement) {
        return;
    }

    const currentValue = parseInt(quantityElement.textContent || "1", 10);
    if (quantity > 0 && currentValue >= MAX_PRODUCT_QUANTITY) {
        showCartNotification("warning", `Maximálne množstvo je ${MAX_PRODUCT_QUANTITY} kusov.`);
        return;
    }

    const nextValue = Math.max(1, Math.min(MAX_PRODUCT_QUANTITY, currentValue + quantity));
    quantityElement.textContent = String(nextValue);
};

const handleAddToCart = (event, product) => {
    const actionWrap = event.currentTarget.closest(".c-solution-product__actions");
    const quantityElement = actionWrap?.querySelector('[data-role="quantity-value"]');
    const quantity = parseInt(quantityElement?.textContent || "1", 10);

    if (quantity > MAX_PRODUCT_QUANTITY) {
        showCartNotification("warning", `Maximálne množstvo je ${MAX_PRODUCT_QUANTITY} kusov.`);
        return;
    }

    console.log("Add to cart", {
        productId: product.id,
        quantity,
    });

    showCartNotification(
        "success",
        `${formatQuantityLabel(quantity)} produktu ${product.name} ${formatAddedToCartVerb(quantity)} do košíka.`
    );
};

const renderStars = (rating = 0, reviewCount = 0) => {
    const normalizedRating = Math.max(0, Math.min(5, Math.round(toSafeNumber(rating, 0))));
    const normalizedReviewCount = Math.max(0, Math.round(toSafeNumber(reviewCount, 0)));

    return html`
    <div class="c-solution-product__rating" aria-label="Hodnotenie: ${normalizedRating} z 5">
        ${Array.from({ length: 5 }, (_, index) => html`
            <span
                class="c-solution-product__star ${index < normalizedRating ? "is-active" : ""}"
                aria-hidden="true"
                >★</span
            >
        `)}
        <span class="c-solution-product__reviews" aria-hidden="true">(${normalizedReviewCount})</span>
    </div>
`;
};

// Solution main banner
const solutionBanner = (banner) => html`
    <div class="c-solution-banner">
        <div
            class="c-solution-banner__image"
            style="background-image: url(${BANNER_IMAGE_URL || getStringValue(banner?.imageUrl)})"
        ></div>
        <div class="c-solution-banner__overlay"></div>
        <div class="c-solution-banner__content">
            <h1 class="c-solution-banner__content__title">${getStringValue(banner?.title, DEFAULT_BANNER.title)}</h1>
            <div class="c-solution-banner__content__description">
                ${getStringValue(banner?.description, DEFAULT_BANNER.description)}
            </div>
            <button class="c-solution-banner__content__button" type="button" @click=${() => handleBannerClick()}>
                <span class="sb-text">${getStringValue(banner?.ctaText, DEFAULT_BANNER.ctaText)}</span>
                <svg
                    class="sb-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    focusable="false"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M4.16663 10H15.8333M15.8333 10L9.99996 4.16669M15.8333 10L9.99996 15.8334"
                        stroke="currentColor"
                        stroke-width="1.67"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
        </div>
    </div>
`;

// Solution CTA section
const solutionCta = (ctaBanner) => html`
    <div class="c-solution-cta">
        <div
            class="c-solution-cta__image"
            style="background-image: url(${SECRET_OFFER_IMAGE_URL || getStringValue(ctaBanner?.imageUrl)})"
        ></div>

        <div class="c-solution-cta__overlay"></div>

        <div class="c-solution-cta__content">
            <h2 class="c-solution-cta__content__title">${getStringValue(ctaBanner?.title, DEFAULT_CTA_BANNER.title)}</h2>

            <div class="c-solution-cta__content__description">
                ${getStringValue(ctaBanner?.description, DEFAULT_CTA_BANNER.description)}
            </div>

            <button class="c-solution-cta__content__button" type="button" @click=${() => handleCtaClick()}>
                <span class="sc-text">${getStringValue(ctaBanner?.ctaText, DEFAULT_CTA_BANNER.ctaText)}</span>

                <svg
                    class="sc-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    focusable="false"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M4.16663 10H15.8333M15.8333 10L9.99996 4.16669M15.8333 10L9.99996 15.8334"
                        stroke="currentColor"
                        stroke-width="1.67"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
        </div>
    </div>
`;

const solutionProducts = (products) => html`
    ${getArrayValue(products).length === 0
        ? renderEmptyState("Produkty sa nepodarilo načítať", "Skúste stránku obnoviť alebo sa vráťte neskôr.")
        : html`
              <div class="c-solution-products">
                  ${getArrayValue(products).map((product) => {
                      const productName = getStringValue(product?.name, "Produkt bez názvu");
                      const productStock = getStringValue(product?.stock, "Dostupnosť na vyžiadanie");
                      const currency = getStringValue(product?.currency, "EUR");
                      const imageUrl = getProductImageUrl(product);
                      const safeBadges = getArrayValue(product?.badges);

                      return html`
                          <article class="c-solution-product" aria-label="${productName}">
                    <div class="c-solution-product__badges">
                        ${safeBadges.map(
                            (badge) => html`
                                <span class="c-solution-product__badge ${getBadgeClass(badge?.type)}"
                                    >${getStringValue(badge?.label, "Info")}</span
                                >
                            `
                        )}
                    </div>

                    <div class="c-solution-product__image-wrap">
                        ${imageUrl
                            ? html`
                                  <img
                                      class="c-solution-product__image"
                                      src=${imageUrl}
                                      alt=${productName}
                                      loading="lazy"
                                      decoding="async"
                                      @error=${(event) => applyImageFallback(event, DEFAULT_PRODUCT_IMAGE_URL)}
                                  />
                              `
                            : html`<div class="c-solution-product__image-fallback" aria-hidden="true">Bez obrázka</div>`}
                    </div>

                    ${renderStars(product?.rating, product?.reviewCount)}

                    <h3 class="c-solution-product__title">${productName}</h3>

                    <div class="c-solution-product__prices">
                        <span class="c-solution-product__price c-solution-product__price--original"
                            >${formatPriceWithCurrency(product?.originalPrice, currency)}</span
                        >
                        <span class="c-solution-product__price c-solution-product__price--sale"
                            >${formatPriceWithCurrency(product?.salePrice, currency)}</span
                        >
                        <span class="c-solution-product__price-without-vat"
                            >${formatPriceWithCurrency(product?.priceWithoutVAT, currency)} bez DPH</span
                        >
                    </div>

                    <div class="c-solution-product__stock">${productStock}</div>

                    <div class="c-solution-product__actions">
                        <div class="c-solution-product__quantity" aria-label="Počet kusov">
                            <button
                                class="c-solution-product__qty-btn"
                                type="button"
                                aria-label="Znížiť množstvo produktu ${productName}"
                                @click=${(event) => changeQuantity(event, -1)}
                            >
                                -
                            </button>
                            <span class="c-solution-product__qty-value" data-role="quantity-value" aria-live="polite"
                                >1</span
                            >
                            <button
                                class="c-solution-product__qty-btn"
                                type="button"
                                aria-label="Zvýšiť množstvo produktu ${productName}"
                                @click=${(event) => changeQuantity(event, 1)}
                            >
                                +
                            </button>
                        </div>

                        <button
                            class="c-solution-product__add-to-cart"
                            type="button"
                            aria-label="Pridať produkt ${productName} do košíka"
                            @click=${(event) => handleAddToCart(event, product)}
                        >
                            <svg
                                class="c-solution-product__add-to-cart-icon"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                                focusable="false"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M3 4H5L7.4 15.2C7.49 15.63 7.73 16.01 8.08 16.28C8.43 16.55 8.87 16.68 9.31 16.65H18.8C19.23 16.65 19.65 16.5 19.98 16.23C20.31 15.96 20.53 15.59 20.6 15.17L22 8H6"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <circle cx="9" cy="20" r="1.5" fill="currentColor" />
                                <circle cx="19" cy="20" r="1.5" fill="currentColor" />
                            </svg>
                            <span>Do košíka</span>
                        </button>
                    </div>
                </article>
            `;
                  })}
              </div>
          `}
`;

const CATEGORY_ORDER = [
    "elektricke-naradie",
    "zahrada-a-les",
    "cistenie-a-upratovanie",
    "rucne-naradie",
    "prislusenstvo",
];

const CATEGORY_AREA_CLASS = {
    "elektricke-naradie": "is-electric",
    "zahrada-a-les": "is-garden",
    "rucne-naradie": "is-manual",
    "cistenie-a-upratovanie": "is-cleaning",
    prislusenstvo: "is-accessories",
};

const CATEGORY_IMAGE_CLASS = {
    "zahrada-a-les": "is-image-wide",
    "cistenie-a-upratovanie": "is-image-wide",
};

const CATEGORY_IMAGE_SRC = {
    "elektricke-naradie": new URL("../assets/images/categories/elektricke-naradie.png", import.meta.url).href,
    "zahrada-a-les": new URL("../assets/images/categories/zahrada-lest.png", import.meta.url).href,
    "cistenie-a-upratovanie": new URL(
        "../assets/images/categories/cisteniea-a-upratovanie.jpg",
        import.meta.url
    ).href,
    "rucne-naradie": new URL("../assets/images/categories/rucne-naradie.png", import.meta.url).href,
    prislusenstvo: new URL("../assets/images/categories/prislusenstvo.jpg", import.meta.url).href,
};

const sortCategories = (categories = []) => {
    const orderMap = new Map(CATEGORY_ORDER.map((id, index) => [id, index]));

    const normalizedCategories = getArrayValue(categories).filter(
        (category) => category && typeof category === "object"
    );

    return [...normalizedCategories].sort((first, second) => {
        const firstId = getStringValue(first?.id);
        const secondId = getStringValue(second?.id);
        const firstIndex = orderMap.has(firstId) ? orderMap.get(firstId) : Number.MAX_SAFE_INTEGER;
        const secondIndex = orderMap.has(secondId) ? orderMap.get(secondId) : Number.MAX_SAFE_INTEGER;

        return firstIndex - secondIndex;
    });
};

const getVisibleSubcategories = (category) => {
    if (!Array.isArray(category.subcategories)) {
        return [];
    }

    if (category.id === "prislusenstvo") {
        return category.subcategories.slice(0, 8);
    }

    if (category.id === "zahrada-a-les" || category.id === "cistenie-a-upratovanie") {
        return category.subcategories.slice(0, 6);
    }

    return category.subcategories.slice(0, 4);
};

const solutionCategories = (categories) => {
    const sortedCategories = sortCategories(getArrayValue(categories));

    if (sortedCategories.length === 0) {
        return renderEmptyState("Kategórie nie sú dostupné", "Momentálne sa nepodarilo načítať zoznam kategórií.");
    }

    return html`
        <section class="c-solution-categories-wrap" aria-label="Top kategórie produktov">
            <h2 class="c-solution-categories-wrap__title">Top kategórie produktov</h2>

            <div class="c-solution-categories">
                ${sortedCategories.map((category) => {
                    const areaClass = CATEGORY_AREA_CLASS[category?.id] || "";
                    const imageClass = CATEGORY_IMAGE_CLASS[category?.id] || "";
                    const subcategories = getVisibleSubcategories(category);
                    const imageSrc =
                        CATEGORY_IMAGE_SRC[category?.id] || getStringValue(category?.imageUrl) || DEFAULT_CATEGORY_IMAGE_URL;
                    const categoryName = getStringValue(category?.name, "Kategória bez názvu");
                    const categoryLink = getSafeHref(category?.link);
                    const productCount = Math.max(0, Math.round(toSafeNumber(category?.productCount, 0)));

                    return html`
                        <article class="c-solution-category ${areaClass}">
                            <div class="c-solution-category__image-wrap ${imageClass}">
                                ${imageSrc
                                    ? html`
                                          <img
                                              class="c-solution-category__image"
                                              src=${imageSrc}
                                              alt=${categoryName}
                                              loading="lazy"
                                              decoding="async"
                                              @error=${(event) => applyImageFallback(event, DEFAULT_CATEGORY_IMAGE_URL)}
                                          />
                                      `
                                    : html`<div class="c-solution-product__image-fallback" aria-hidden="true">Bez obrázka</div>`}

                                <div class="c-solution-category__overlay"></div>

                                <div class="c-solution-category__content">
                                    <h3 class="c-solution-category__title">
                                        <span class="c-solution-category__title-text">${categoryName}</span>
                                        <span class="c-solution-category__count">${productCount}</span>
                                    </h3>

                                    <ul class="c-solution-category__subcategories">
                                        ${subcategories.length > 0
                                            ? subcategories.map(
                                                  (subcategory) => {
                                                      const subcategoryName = getStringValue(
                                                          subcategory?.name,
                                                          "Podkategória"
                                                      );
                                                      const subcategoryHref = getSafeHref(subcategory?.link);

                                                      return html`
                                                <li class="c-solution-category__subitem">
                                                    ${subcategoryHref
                                                        ? html`
                                                              <a class="c-solution-category__sublink" href=${subcategoryHref}
                                                                  >${subcategoryName}</a
                                                              >
                                                          `
                                                        : html`
                                                              <span class="c-solution-category__sublink is-disabled" aria-disabled="true"
                                                                  >${subcategoryName}</span
                                                              >
                                                          `}
                                                </li>
                                            `
                                                  }
                                              )
                                            : html`
                                                  <li class="c-solution-category__subitem is-empty">
                                                      <span class="c-solution-category__sublink">Podkategórie nie sú dostupné</span>
                                                  </li>
                                              `}
                                    </ul>

                                    ${categoryLink
                                        ? html`
                                              <a class="c-solution-category__cta" href=${categoryLink}
                                                  >${getStringValue(category?.ctaText, "Všetky kategórie")}
                                                  <span aria-hidden="true">→</span></a
                                              >
                                          `
                                        : html`
                                              <span class="c-solution-category__cta is-disabled" aria-disabled="true"
                                                  >${getStringValue(category?.ctaText, "Všetky kategórie")}
                                                  <span aria-hidden="true">→</span></span
                                              >
                                          `}
                                </div>
                            </div>
                        </article>
                    `;
                })}
            </div>
        </section>
    `;
};

// Main page template
export const renderSolutionPage = (data) => {
    if (!data) {
        return html`<div class="l-solution">Loading...</div>`;
    }

    return html`
        <div class="l-solution">
            <div class="l-solution__banner">
                <div class="l-container">${solutionBanner(data.banner || DEFAULT_BANNER)}</div>
            </div>

            <div class="l-solution__content">
                <div class="l-container is-shorter">
                    <div class="c-solution-content">
                        <div class="c-solution-content__cta">${solutionCta(data.ctaBanner || DEFAULT_CTA_BANNER)}</div>

                        <div class="c-solution-content__products">${solutionProducts(data.products)}</div>
                    </div>
                </div>
            </div>

            <div class="l-solution__categories">
                <div class="l-container is-shorter">${solutionCategories(data.categories)}</div>
            </div>
        </div>
    `;
};

/**
 * Load data and render the solution page
 */
export const loadAndRenderSolutionPage = async () => {
    try {
        const data = await loadData();
        return renderSolutionPage(data);
    } catch (error) {
        return html`<div class="l-solution">Error loading data: ${error.message}</div>`;
    }
};
