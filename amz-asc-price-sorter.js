// ==UserScript==
// @name         Amazon Auto-Sort: Lowest to Highest Price
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Automatically sorts Amazon search results by lowest to highest price
// @author       FraustByte
// @match        https://www.amazon.com/s*
// @match        https://www.amazon.co.uk/s*
// @match        https://www.amazon.ca/s*
// @match        https://www.amazon.com.au/s*
// @match        https://www.amazon.de/s*
// @match        https://www.amazon.fr/s*
// @match        https://www.amazon.es/s*
// @match        https://www.amazon.it/s*
// @match        https://www.amazon.co.jp/s*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const SORT_PARAM = 'price-asc-rank';
// Sales Tax Value
    const MARKUP = 1.1;
    const PROCESSED_ATTR = 'data-markup-applied';

    // ── Sort redirect ────────────────────────────────────────────────────────

    function getCurrentSort() {
        const url = new URL(window.location.href);
        return url.searchParams.get('s');
    }

    function isSearchPage() {
        const url = new URL(window.location.href);
        return url.searchParams.has('k') || url.searchParams.has('rh') || url.pathname.includes('/s');
    }

    function redirectToSorted() {
        if (!isSearchPage()) return;
        if (getCurrentSort() === SORT_PARAM) return;

        const url = new URL(window.location.href);
        url.searchParams.set('s', SORT_PARAM);
        window.location.replace(url.toString());
    }

    redirectToSorted();

    // ── Price markup ─────────────────────────────────────────────────────────

    // Whole and fraction spans are siblings inside a parent span.a-price.
    // We process them together so that $9.99 * 1.1 = $10.99, not $9.$11.
    function applyMarkupToPrice(wholeNode) {
        if (wholeNode.getAttribute(PROCESSED_ATTR)) return;

        // Find the sibling fraction span (may not exist for round prices)
        const parent = wholeNode.closest('span.a-price');
        const fractionNode = parent ? parent.querySelector('span.a-price-fraction') : null;

        const wholeRaw = wholeNode.textContent.replace(/[,.\s]/g, '').trim();
        const fractionRaw = fractionNode ? fractionNode.textContent.replace(/\D/g, '').trim() : '00';

        const original = parseFloat(`${wholeRaw}.${fractionRaw}`);
        if (isNaN(original) || original <= 0) return;

        const marked = (original * MARKUP).toFixed(2);
        const [newWhole, newFraction] = marked.split('.');

        // Mark both nodes before writing so the MutationObserver doesn't re-trigger
        wholeNode.setAttribute(PROCESSED_ATTR, '1');
        if (fractionNode) fractionNode.setAttribute(PROCESSED_ATTR, '1');

        wholeNode.textContent = parseInt(newWhole, 10).toLocaleString();
        if (fractionNode) fractionNode.textContent = newFraction;
    }

    function processAll() {
        document.querySelectorAll(`span.a-price-whole:not([${PROCESSED_ATTR}])`).forEach(applyMarkupToPrice);
    }

    // Run once the DOM is ready, then watch for dynamically loaded results
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processAll);
    } else {
        processAll();
    }

    const observer = new MutationObserver(() => processAll());
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
    });
})();
