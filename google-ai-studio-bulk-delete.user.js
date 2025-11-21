// ==UserScript==
// @name         Google AI Studio Bulk Delete
// @namespace    http://tampermonkey.net/
// @version      2025-11-21-v5-greasy
// @description  Bulk delete (mass-remove) chats from Google AI Studio in batch.
// @author       Lorenzo Alali
// @match        https://aistudio.google.com/*
// @grant        none
// @license      MIT
// @homepageURL  https://github.com/lorenzoalali/Gemini-and-AI-Studio-Mass-Chat-Deleter
// @run-at       document-idle
// @downloadURL https://update.greasyfork.org/scripts/555870/Google%20AI%20Studio%20Bulk%20Delete.user.js
// @updateURL https://update.greasyfork.org/scripts/555870/Google%20AI%20Studio%20Bulk%20Delete.meta.js
// ==/UserScript==

/*
 * =======================================================================
 * --- DISCLAIMER & IMPORTANT INFORMATION ---
 *
 * This tool (and its Gemini equivalent) can be found
 * on GitHub https://github.com/lorenzoalali/Google-AI-Studio-Bulk-Delete-UserScript
 * and on Greasy Fork https://greasyfork.org/en/scripts/555870-google-ai-studio-bulk-delete
 *
 * --- USAGE AT YOUR OWN RISK ---
 * The author provides no guarantees regarding the performance, safety, or functionality of this script. You assume
 * all risks associated with its use. The author offers no support and is not responsible for any potential data
 * loss or issues that may arise.
 *
 * --- FUTURE COMPATIBILITY ---
 * This script's operation depends on the current Document Object Model (DOM) of the Google AI Studio platform.
 * Modifications to the website by Google are likely to render this script non-functional in the future. While the
 * author does not plan on providing proactive updates or support, contributions in the form of GitHub pull requests
 * are welcome.
 * =======================================================================
 */

(function () {
    'use strict';

    // --- State Management ---
    const aBULK_DELETE_ALL_KEY = 'isAiStudioBulkDeletingAll';
    const aBULK_DELETE_SELECTED_KEY = 'isAiStudioBulkDeletingSelected';
    const aBULK_DELETE_SUCCESS_KEY = 'aiStudioBulkDeleteSuccessCount';
    const aBULK_DELETE_FAIL_KEY = 'aiStudioBulkDeleteFailCount';

    let isStopRequested = false;
    let isProcessing = false; // Prevent multiple loops

    // Global UI References to handle re-renders
    const uiElements = {
        allBtn: null,
        selBtn: null,
        stopBtn: null
    };

    // --- UI Helper & Styles ---
    const UI = {
        injectStyles: () => {
            if (document.getElementById('gas-bulk-delete-styles')) return;
            const style = document.createElement('style');
            style.id = 'gas-bulk-delete-styles';
            style.textContent = `
                .gas-toast-container {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                }
                .gas-toast {
                    background: #333;
                    color: #fff;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-family: 'Google Sans', Roboto, Arial, sans-serif;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.3s, transform 0.3s;
                    pointer-events: auto;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 300px;
                    justify-content: center;
                }
                .gas-toast.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                .gas-toast.success { background: #0f9d58; }
                .gas-toast.error { background: #d93025; }
                .gas-toast.warning { background: #f4b400; color: #202124; }
                .gas-toast.info { background: #1a73e8; }

                .gas-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 10001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .gas-modal-overlay.visible { opacity: 1; }
                .gas-modal {
                    background: white;
                    padding: 24px;
                    border-radius: 8px;
                    width: 400px;
                    max-width: 90%;
                    box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
                    font-family: 'Google Sans', Roboto, Arial, sans-serif;
                    transform: scale(0.95);
                    transition: transform 0.2s;
                }
                .gas-modal-overlay.visible .gas-modal { transform: scale(1); }
                .gas-modal-title {
                    font-size: 18px;
                    font-weight: 500;
                    margin-bottom: 12px;
                    color: #202124;
                }
                .gas-modal-content {
                    font-size: 14px;
                    color: #5f6368;
                    line-height: 1.5;
                    margin-bottom: 24px;
                    white-space: pre-wrap;
                }
                .gas-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .gas-btn {
                    border: none;
                    background: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    transition: background 0.2s;
                }
                .gas-btn:hover { background: rgba(0,0,0,0.04); }
                .gas-btn.primary {
                    background: #1a73e8;
                    color: white;
                }
                .gas-btn.primary:hover { background: #1557b0; }
                .gas-btn.danger {
                    background: #d93025;
                    color: white;
                }
                .gas-btn.danger:hover { background: #a50e0e; }
            `;
            document.head.appendChild(style);
        },

        showToast: (message, type = 'info', duration = 3000) => {
            UI.injectStyles();
            let container = document.querySelector('.gas-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'gas-toast-container';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `gas-toast ${type}`;

            let icon = '';
            if (type === 'success') icon = '✅';
            if (type === 'error') icon = '❌';
            if (type === 'warning') icon = '⚠️';
            if (type === 'info') icon = 'ℹ️';

            toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
            container.appendChild(toast);

            // Trigger reflow
            toast.offsetHeight;
            toast.classList.add('visible');

            if (duration > 0) {
                setTimeout(() => {
                    toast.classList.remove('visible');
                    setTimeout(() => toast.remove(), 300);
                }, duration);
            }
            return toast;
        },

        showConfirm: (title, message, confirmText = 'Confirm', confirmType = 'primary') => {
            UI.injectStyles();
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'gas-modal-overlay';

                const modal = document.createElement('div');
                modal.className = 'gas-modal';

                modal.innerHTML = `
                    <div class="gas-modal-title">${title}</div>
                    <div class="gas-modal-content">${message}</div>
                    <div class="gas-modal-actions">
                        <button class="gas-btn cancel-btn">Cancel</button>
                        <button class="gas-btn ${confirmType} confirm-btn">${confirmText}</button>
                    </div>
                `;

                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                // Trigger reflow
                overlay.offsetHeight;
                overlay.classList.add('visible');

                const close = (result) => {
                    overlay.classList.remove('visible');
                    setTimeout(() => overlay.remove(), 200);
                    resolve(result);
                };

                modal.querySelector('.cancel-btn').addEventListener('click', () => close(false));
                modal.querySelector('.confirm-btn').addEventListener('click', () => close(true));
                // Close on click outside
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) close(false);
                });
            });
        }
    };

    // --- Configuration ---
    const aDELAY_BETWEEN_ACTIONS = 500;
    const aDELAY_AFTER_DELETION = 1500;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Count Management ---
    function getCounts() {
        return {
            success: parseInt(sessionStorage.getItem(aBULK_DELETE_SUCCESS_KEY) || '0', 10),
            fail: parseInt(sessionStorage.getItem(aBULK_DELETE_FAIL_KEY) || '0', 10)
        };
    }

    function incrementSuccess() {
        const current = getCounts().success;
        sessionStorage.setItem(aBULK_DELETE_SUCCESS_KEY, (current + 1).toString());
    }

    function incrementFail() {
        const current = getCounts().fail;
        sessionStorage.setItem(aBULK_DELETE_FAIL_KEY, (current + 1).toString());
    }

    function resetCounts() {
        sessionStorage.setItem(aBULK_DELETE_SUCCESS_KEY, '0');
        sessionStorage.setItem(aBULK_DELETE_FAIL_KEY, '0');
    }

    function clearCounts() {
        sessionStorage.removeItem(aBULK_DELETE_SUCCESS_KEY);
        sessionStorage.removeItem(aBULK_DELETE_FAIL_KEY);
    }

    async function findAndClickByText(
        selector,
        textOptions,
        maxRetries = 5,
        retryInterval = 250
    ) {
        for (let i = 0; i < maxRetries; i++) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const elementText = element.textContent.trim().toLowerCase();
                const found = textOptions.some(text =>
                    elementText.includes(text.toLowerCase())
                );
                if (found) {
                    element.click();
                    return true;
                }
            }
            await sleep(retryInterval);
        }
        console.error(
            `Could not find element with selector "${selector}" ` +
            `and text from [${textOptions.join(', ')}]`
        );
        return false;
    }

    /**
     * Processes a batch of deletions (all visible items) and then reloads.
     */
    async function processBatchDeletion(items) {
        isProcessing = true;

        if (uiElements.allBtn) uiElements.allBtn.disabled = true;
        if (uiElements.selBtn) uiElements.selBtn.disabled = true;
        if (uiElements.stopBtn) uiElements.stopBtn.style.display = 'inline-flex';

        for (let i = 0; i < items.length; i++) {
            if (isStopRequested) {
                sessionStorage.removeItem(aBULK_DELETE_ALL_KEY);
                clearCounts();
                UI.showToast("Bulk delete process stopped by user.", 'warning');
                isProcessing = false;
                break;
            }

            const item = items[i];
            if (!document.body.contains(item)) continue;

            const counts = getCounts();
            const totalProcessed = counts.success + counts.fail + 1;

            const progressHTML =
                `<span style="font-size: 1.2em;">🔥</span> <span>Deleting... (${totalProcessed})</span>`;

            if (uiElements.allBtn) uiElements.allBtn.innerHTML = progressHTML;

            try {
                item.click();
                await sleep(aDELAY_BETWEEN_ACTIONS);

                const delMenu = await findAndClickByText(
                    'button[role="menuitem"]',
                    ['Delete']
                );
                if (!delMenu) {
                    document.querySelector('.cdk-overlay-backdrop')?.click();
                    incrementFail();
                    continue;
                }
                await sleep(aDELAY_BETWEEN_ACTIONS);

                const delConfirm = await findAndClickByText(
                    '.mat-mdc-dialog-actions button',
                    ['Delete']
                );
                if (!delConfirm) {
                    document.querySelector('.cdk-overlay-backdrop')?.click();
                    incrementFail();
                    continue;
                }

                incrementSuccess();
                await sleep(aDELAY_AFTER_DELETION);
            } catch (e) {
                console.error("Error deleting item:", e);
                incrementFail();
            }
        }

        if (!isStopRequested) {
            location.reload();
        } else {
            if (uiElements.allBtn) {
                uiElements.allBtn.disabled = false;
                uiElements.allBtn.innerHTML =
                    `<span style="font-size: 1.2em;">🔥</span> <span>Delete All</span>`;
            }
            if (uiElements.selBtn) uiElements.selBtn.disabled = false;
            if (uiElements.stopBtn) uiElements.stopBtn.style.display = 'none';
            isProcessing = false;
        }
    }


    /**
     * Deletes a single item and triggers a page reload.
     */
    async function deleteSingleItemAndReload(itemMenuButton, onComplete) {
        isProcessing = true;
        if (!document.body.contains(itemMenuButton)) {
            incrementFail();
            isProcessing = false;
            return;
        }

        try {
            itemMenuButton.click();
            await sleep(aDELAY_BETWEEN_ACTIONS);

            const delMenu = await findAndClickByText(
                'button[role="menuitem"]',
                ['Delete']
            );
            if (!delMenu) {
                document.querySelector('.cdk-overlay-backdrop')?.click();
                incrementFail();
                isProcessing = false;
                return;
            }
            await sleep(aDELAY_BETWEEN_ACTIONS);

            const delConfirm = await findAndClickByText(
                '.mat-mdc-dialog-actions button',
                ['Delete']
            );
            if (!delConfirm) {
                document.querySelector('.cdk-overlay-backdrop')?.click();
                incrementFail();
                isProcessing = false;
                return;
            }

            incrementSuccess();
            await sleep(aDELAY_AFTER_DELETION);

            if (onComplete) onComplete();
            if (!isStopRequested) location.reload();
        } catch (e) {
            console.error("Error deleting single item:", e);
            incrementFail();
            if (onComplete) onComplete(); // Proceed anyway
            if (!isStopRequested) location.reload();
        }
        isProcessing = false;
    }

    /**
     * Starts the 'Bulk Delete All' process.
     */
    async function startBulkDeleteAll(isAutoStart = false) {
        const query = 'ms-prompt-options-menu button[aria-label="More options"]';
        const items = document.querySelectorAll(query);

        if (items.length === 0) {
            sessionStorage.removeItem(aBULK_DELETE_ALL_KEY);
            const counts = getCounts();
            clearCounts();

            if (counts.success > 0 || counts.fail > 0) {
                UI.showToast(`Bulk delete complete. Deleted: ${counts.success}, Failed: ${counts.fail}`, 'success', 5000);
            } else {
                UI.showToast("Bulk delete complete. Your library is now empty.", 'success', 5000);
            }
            isProcessing = false;
            return;
        }

        if (!isAutoStart) {
            const confirmMsg =
                "This will bulk-delete ALL items in your history.\n\n" +
                "It will delete items in batches of 5, reload the page, and " +
                "continue until finished.\n\nAre you sure you want to proceed?";

            const userConfirmation = await UI.showConfirm(
                "Delete All Chats?",
                confirmMsg,
                "Delete All",
                "danger"
            );
            if (!userConfirmation) return;
            sessionStorage.setItem(aBULK_DELETE_ALL_KEY, 'true');
            resetCounts();
        }

        processBatchDeletion(Array.from(items));
    }

    /**
     * Starts the 'Bulk Delete Selected' process.
     */
    async function startBulkDeleteSelected() {
        sessionStorage.removeItem(aBULK_DELETE_ALL_KEY); // Safety clear

        const selector = '.bulk-delete-checkbox:checked';
        const selectedCheckboxes = document.querySelectorAll(selector);
        if (selectedCheckboxes.length === 0) {
            UI.showToast("No items selected for deletion.", 'warning');
            return;
        }

        const confirmMsg = `Are you sure you want to delete the ${selectedCheckboxes.length} selected item(s)?`;
        const userConfirmation = await UI.showConfirm(
            "Delete Selected Chats?",
            confirmMsg,
            "Delete Selected",
            "danger"
        );
        if (!userConfirmation) return;

        const itemHrefs = Array.from(selectedCheckboxes).map(cb => {
            const link = cb.closest('tr').querySelector('a.name-btn');
            return link ? link.getAttribute('href') : null;
        }).filter(Boolean);

        const key = aBULK_DELETE_SELECTED_KEY;
        sessionStorage.setItem(key, JSON.stringify(itemHrefs));
        resetCounts();
        location.reload(); // Start the process
    }

    function addCheckboxesToRows() {
        // Only run if we are on the library page
        if (!location.href.includes('/library')) return;

        const rows = document.querySelectorAll('tbody tr.mat-mdc-row');
        rows.forEach(row => {
            if (row.querySelector('.bulk-delete-checkbox-cell')) return;

            const checkboxCell = document.createElement('td');
            checkboxCell.className = 'mat-mdc-cell mdc-data-table__cell cdk-cell bulk-delete-checkbox-cell';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'bulk-delete-checkbox';
            Object.assign(checkbox.style, {
                width: '18px',
                height: '18px',
                cursor: 'pointer'
            });
            checkboxCell.appendChild(checkbox);
            row.prepend(checkboxCell);
        });

        const headerRow = document.querySelector('thead tr');
        if (!headerRow) return;

        const headerExists = headerRow.querySelector('.bulk-delete-header-cell');
        if (headerExists) return;

        const th = document.createElement('th');
        th.className = 'mat-mdc-header-cell mdc-data-table__header-cell cdk-header-cell bulk-delete-header-cell';

        const masterCheckbox = document.createElement('input');
        masterCheckbox.type = 'checkbox';
        masterCheckbox.id = 'master-bulk-delete-checkbox';
        Object.assign(masterCheckbox.style, {
            width: '18px',
            height: '18px',
            cursor: 'pointer'
        });

        masterCheckbox.addEventListener('change', (event) => {
            const isChecked = event.target.checked;
            const allCheckboxes = document.querySelectorAll(
                'input.bulk-delete-checkbox'
            );
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        });

        th.appendChild(masterCheckbox);
        headerRow.prepend(th);
    }


    function addButtons() {
        // Only run if we are on the library page
        if (!location.href.includes('/library')) return;

        // If buttons exist, update references and return
        const existingAll = document.getElementById('bulk-delete-all-button');
        if (existingAll) {
            uiElements.allBtn = existingAll;
            uiElements.selBtn = document.getElementById('bulk-delete-selected-button');
            uiElements.stopBtn = document.getElementById('stop-bulk-delete-button');
            return;
        }

        const wrapper = document.querySelector('.lib-header .actions-wrapper');
        if (!wrapper) return;

        // Use the EXACT classes from the native "Open in Drive" button
        const btnClass = 'responsive-button-viewport-medium viewport-small-hidden ms-button-primary';

        // Minimal inline styles to position the buttons and override specific colors.
        // We rely on the classes above for shape, padding, font, and height.
        const commonStyle = {
            marginLeft: '10px',
            cursor: 'pointer',
            color: 'white',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textDecoration: 'none',
            border: 'none' // Ensure no border overrides the class
        };

        // --- Delete All Button ---
        const bulkDeleteAllButton = document.createElement('button');
        bulkDeleteAllButton.id = 'bulk-delete-all-button';
        // Add 'ms-button' attribute as seen in the native anchor tag
        bulkDeleteAllButton.setAttribute('ms-button', '');
        bulkDeleteAllButton.innerHTML =
            `<span style="font-size: 1.2em;">🔥</span> <span>Delete All</span>`;
        bulkDeleteAllButton.className = btnClass;
        Object.assign(bulkDeleteAllButton.style, {
            ...commonStyle,
            backgroundColor: '#d93025', // Google Red override for 'delete' action
        });

        // --- Delete Selected Button ---
        const bulkDeleteSelectedButton = document.createElement('button');
        bulkDeleteSelectedButton.id = 'bulk-delete-selected-button';
        bulkDeleteSelectedButton.setAttribute('ms-button', '');
        bulkDeleteSelectedButton.innerHTML =
            `<span style="font-size: 1.2em;">🗑️</span> <span>Delete Selected</span>`;
        bulkDeleteSelectedButton.className = btnClass;
        Object.assign(bulkDeleteSelectedButton.style, {
            ...commonStyle,
            backgroundColor: '#e37400', // Google Orange/Warning override
        });

        // --- Stop Button ---
        const stopButton = document.createElement('button');
        stopButton.id = 'stop-bulk-delete-button';
        stopButton.setAttribute('ms-button', '');
        stopButton.innerHTML =
            `<span style="font-size: 1.2em;">🛑</span> <span>Stop</span>`;
        stopButton.className = btnClass;
        Object.assign(stopButton.style, {
            ...commonStyle,
            // No background color override needed here if we want the native Blue (ms-button-primary default)
            // But explicit is safer if the class logic changes:
            backgroundColor: '#1a73e8', // Google Blue
            display: 'none' // Hidden by default
        });

        // --- Hover Effects ---
        // Native buttons typically have a state overlay.
        // We simulate this simply by dimming slightly on hover.
        const addHover = (btn) => {
            btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(0.95)');
            btn.addEventListener('mouseleave', () => btn.style.filter = 'brightness(1)');
        };
        addHover(bulkDeleteAllButton);
        addHover(bulkDeleteSelectedButton);
        addHover(stopButton);

        // --- Event Listeners ---
        stopButton.addEventListener('click', () => {
            isStopRequested = true;
            sessionStorage.removeItem(aBULK_DELETE_ALL_KEY);
            sessionStorage.removeItem(aBULK_DELETE_SELECTED_KEY);
            clearCounts();
            stopButton.innerHTML = `<span style="font-size: 1.2em;">🛑</span> <span>Stopping...</span>`;
            stopButton.disabled = true;
            UI.showToast(
                "Bulk delete will stop. The page will not reload after the current action.",
                'info',
                5000
            );
        });

        bulkDeleteAllButton.addEventListener('click', () =>
            startBulkDeleteAll(false)
        );
        bulkDeleteSelectedButton.addEventListener('click', () =>
            startBulkDeleteSelected()
        );

        // Append to DOM
        wrapper.appendChild(bulkDeleteSelectedButton);
        wrapper.appendChild(bulkDeleteAllButton);
        wrapper.appendChild(stopButton);

        // Update Global Refs
        uiElements.allBtn = bulkDeleteAllButton;
        uiElements.selBtn = bulkDeleteSelectedButton;
        uiElements.stopBtn = stopButton;

        // If we are processing (e.g. after a re-render), restore UI state
        if (isProcessing) {
            bulkDeleteAllButton.disabled = true;
            bulkDeleteSelectedButton.disabled = true;
            stopButton.style.display = 'inline-flex';
            // Note: innerHTML for progress is updated by the running loop
        }

        setTimeout(() => handleAutoDeletion(), 2000);
    }

    /**
     * Checks session storage on page load and continues any pending
     * deletion process.
     */
    function handleAutoDeletion() {
        if (isProcessing) return; // Already running

        if (sessionStorage.getItem(aBULK_DELETE_ALL_KEY) === 'true') {
            startBulkDeleteAll(true);

        } else if (sessionStorage.getItem(aBULK_DELETE_SELECTED_KEY)) {
            const key = aBULK_DELETE_SELECTED_KEY;
            let itemHrefs = JSON.parse(sessionStorage.getItem(key));

            if (itemHrefs.length > 0) {
                // Update UI for selected deletion
                if (uiElements.allBtn) uiElements.allBtn.disabled = true;
                if (uiElements.selBtn) uiElements.selBtn.disabled = true;
                if (uiElements.stopBtn) uiElements.stopBtn.style.display = 'inline-flex';

                const nextHref = itemHrefs[0];
                const linkSelector = `a.name-btn[href="${nextHref}"]`;
                const nextLink = document.querySelector(linkSelector);

                if (nextLink) {
                    const progressHTML =
                        `<span style="font-size: 1.2em;">🗑️</span> ` +
                        `<span>Deleting ${itemHrefs.length} selected...</span>`;
                    if (uiElements.selBtn) uiElements.selBtn.innerHTML = progressHTML;

                    const itemMenu = nextLink.closest('tr')
                        .querySelector('ms-prompt-options-menu button');

                    deleteSingleItemAndReload(itemMenu, () => {
                        itemHrefs.shift(); // Remove processed item
                        // Always save the array, even if empty, so we detect "finished" state on next load
                        sessionStorage.setItem(key, JSON.stringify(itemHrefs));
                    });
                } else {
                    console.warn(
                        `Item with href ${nextHref} not found. Checking next...`
                    );
                    itemHrefs.shift();
                    sessionStorage.setItem(key, JSON.stringify(itemHrefs));
                    incrementFail();
                    location.reload();
                }
            } else {
                // List is empty, meaning we finished
                sessionStorage.removeItem(key);
                const counts = getCounts();
                clearCounts();
                UI.showToast(`Selected items have been deleted. Deleted: ${counts.success}, Failed: ${counts.fail}`, 'success', 5000);

                if (uiElements.allBtn) uiElements.allBtn.disabled = false;
                if (uiElements.selBtn) {
                    uiElements.selBtn.disabled = false;
                    uiElements.selBtn.innerHTML =
                        `<span style="font-size: 1.2em;">🗑️</span> <span>Delete Selected</span>`;
                }
                if (uiElements.stopBtn) uiElements.stopBtn.style.display = 'none';
            }
        }
    }

    function manageUI() {
        // If we are on the library page, attempt to inject UI
        if (location.href.includes('/library')) {
            addButtons();
            addCheckboxesToRows();
        }
    }

    // --- Observer Setup ---
    const observer = new MutationObserver((mutations) => {
        manageUI();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // --- Fallback Interval ---
    setInterval(() => {
        manageUI();
    }, 1000);

    // Initial Run
    manageUI();

})();