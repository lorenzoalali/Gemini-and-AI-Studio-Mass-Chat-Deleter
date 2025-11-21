// ==UserScript==
// @name         Gemini Bulk Chat Deleter
// @namespace    http://tampermonkey.net/
// @version      2025-11-21-v6-select-delete
// @description  Bulk delete (mass-remove) chats from Gemini in batch. Select specific chats or delete all.
// @author       Lorenzo Alali
// @match        https://gemini.google.com/*
// @grant        GM_addStyle
// @grant        GM_log
// @license      MIT
// @homepageURL  https://github.com/lorenzoalali/Gemini-and-AI-Studio-Mass-Chat-Deleter
// @downloadURL https://update.greasyfork.org/scripts/556503/Gemini%20Bulk%20Chat%20Deleter.user.js
// @updateURL https://update.greasyfork.org/scripts/556503/Gemini%20Bulk%20Chat%20Deleter.meta.js
// ==/UserScript==

/*
 * =======================================================================
 * --- DISCLAIMER & IMPORTANT INFORMATION ---
 *
 * This tool (and its Google AI Studio equivalent) can be found
 * on GitHub https://github.com/lorenzoalali/Google-AI-Studio-Bulk-Delete-UserScript
 * and on Greasy Fork https://greasyfork.org/en/scripts/556503-gemini-bulk-chat-deleter
 *
 * --- USAGE AT YOUR OWN RISK ---
 * The author provides no guarantees regarding the performance, safety, or functionality of this script. You assume
 * all risks associated with its use. The author offers no support and is not responsible for any potential data
 * loss or issues that may arise.
 *
 * --- FUTURE COMPATIBILITY ---
 * This script's operation depends on the current Document Object Model (DOM) of the Gemini platform.
 * Modifications to the website by Google are likely to render this script non-functional in the future. While the
 * author does not plan on providing proactive updates or support, contributions in the form of GitHub pull requests
 * are welcome.
 * =======================================================================
 */

(function () {
    'use strict';

    // --- Styles ---
    const css = `
        #bulk-delete-controls {
            display: flex;
            align-items: center;
            margin-right: 12px;
            z-index: 999;
            gap: 8px;
        }
        .bulk-delete-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            color: white !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            transition: background-color 0.2s, filter 0.2s, opacity 0.2s;
            height: 36px; /* Match Gemini header button height */
        }
        .bulk-delete-btn:hover {
            filter: brightness(0.9);
        }
        .bulk-delete-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            filter: grayscale(0.5);
        }
        .bulk-delete-emoji {
            font-size: 120%;
            line-height: 1;
        }
        .btn-red { background-color: #B3261E; } /* Material Design Red */
        .btn-blue { background-color: #0B57D0; } /* Material Design Blue */
        .btn-orange { background-color: #F29900; color: #202124 !important; } /* Warning/Select Color */

        /* Checkbox Styles */
        .bulk-delete-checkbox {
            appearance: none;
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border: 2px solid #5f6368;
            border-radius: 4px;
            margin-right: 12px; /* Space between checkbox and text */
            cursor: pointer;
            position: relative;
            flex-shrink: 0;
            transition: background-color 0.2s, border-color 0.2s;
            z-index: 100; /* Ensure clickable */
        }
        .bulk-delete-checkbox:checked {
            background-color: #0B57D0;
            border-color: #0B57D0;
        }
        .bulk-delete-checkbox:checked::after {
            content: '';
            position: absolute;
            left: 5px;
            top: 1px;
            width: 4px;
            height: 10px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }
        .bulk-delete-checkbox:hover {
            border-color: #0B57D0;
        }
        
        /* Row Alignment Fix */
        .gemini-bulk-delete-row {
            display: flex !important;
            align-items: center !important;
            flex-direction: row !important;
        }
        .gemini-bulk-delete-row > .conversation {
            flex: 1 !important;
            min-width: 0 !important; /* Critical for text truncation in flex containers */
        }
    `;
    GM_addStyle(css);

    // --- State Variable ---
    let deletionInProgress = false;
    let selectedChats = new Set(); // Store DOM elements or IDs of selected chats

    // --- UI Helper & Styles ---
    const UI = {
        injectStyles: () => {
            if (document.getElementById('gemini-bulk-delete-styles')) return;
            const style = document.createElement('style');
            style.id = 'gemini-bulk-delete-styles';
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

    // --- Helper Functions ---

    function waitForElement(selector, timeout = 3000, parent = document) {
        return new Promise((resolve, reject) => {
            const intervalTime = 200;
            let timeWaited = 0;

            const check = () => {
                const element = parent.querySelector(selector);
                if (element) {
                    resolve(element);
                    return true;
                }
                return false;
            };

            if (check()) return;

            const interval = setInterval(() => {
                if (check()) {
                    clearInterval(interval);
                } else {
                    timeWaited += intervalTime;
                    if (timeWaited >= timeout) {
                        clearInterval(interval);
                        reject(new Error(`Timed out waiting for selector: ${selector}`));
                    }
                }
            }, intervalTime);
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Checkbox Injection Logic ---

    function injectCheckboxes() {
        const historyContainer = document.querySelector('div.conversations-container');
        if (!historyContainer) return;

        const chatItems = Array.from(historyContainer.querySelectorAll('.conversation-actions-container'));

        chatItems.forEach(item => {
            // Check if we already injected a checkbox
            if (item.parentElement.querySelector('.bulk-delete-checkbox')) return;

            // Check if pinned
            const previousSibling = item.previousElementSibling;
            const isPinned = previousSibling && previousSibling.querySelector('.conversation-pin-icon');

            // Do NOT inject checkbox for pinned chats
            if (isPinned) return;

            // Create checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'bulk-delete-checkbox';
            checkbox.title = "Select for deletion";

            // Event listener for selection
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedChats.add(item);
                } else {
                    selectedChats.delete(item);
                }
                updateButtonState();
            });

            // Insert before the chat link (which is usually the previous sibling of the actions container)
            // Structure: [Link/Title] [Actions Container]
            // We want: [Checkbox] [Link/Title] [Actions Container]
            // So we insert before the previousSibling (Link)
            if (previousSibling) {
                previousSibling.parentElement.insertBefore(checkbox, previousSibling);
                previousSibling.parentElement.classList.add('gemini-bulk-delete-row');
            } else {
                // Fallback if structure is weird
                item.parentElement.insertBefore(checkbox, item);
                item.parentElement.classList.add('gemini-bulk-delete-row');
            }
        });
    }

    // --- Core Deletion Logic ---

    async function startBulkDelete(mode = 'ALL') {
        // Verify Sidebar visibility before starting
        const historyContainerCheck = document.querySelector('div.conversations-container');
        if (!historyContainerCheck) {
            UI.showToast("Error: Chat history is not visible. Please open the sidebar.", 'error', 5000);
            return;
        }

        let confirmMsg = "";
        let title = "";
        let confirmBtnText = "";

        if (mode === 'SELECTED') {
            if (selectedChats.size === 0) {
                UI.showToast("No chats selected.", 'warning');
                return;
            }
            title = `Delete ${selectedChats.size} Selected Chats?`;
            confirmMsg = `Are you sure you want to delete the ${selectedChats.size} selected chats? This cannot be undone.`;
            confirmBtnText = "Delete Selected";
        } else {
            title = "Delete All Chats?";
            confirmMsg = "Are you sure you want to permanently delete all chats visible in the sidebar?\n\n(Pinned chats & Gems will be preserved)";
            confirmBtnText = "Delete All";
        }

        const userConfirmation = await UI.showConfirm(
            title,
            confirmMsg,
            confirmBtnText,
            "danger"
        );

        if (!userConfirmation) return;

        if (deletionInProgress) return;
        deletionInProgress = true;
        updateButtonState();
        GM_log(`▶️ Starting bulk delete (Mode: ${mode})...`);

        let successCount = 0;
        let failureCount = 0;
        let consecutiveFailures = 0;

        // Create a list of items to process
        let itemsToProcess = [];
        if (mode === 'SELECTED') {
            itemsToProcess = Array.from(selectedChats);
        } else {
            // For ALL mode, we'll dynamically query, but we can start by clearing selection
            selectedChats.clear();
            // Uncheck all checkboxes visually
            document.querySelectorAll('.bulk-delete-checkbox').forEach(cb => cb.checked = false);
        }

        while (deletionInProgress) {
            try {
                let targetActionContainer = null;

                if (mode === 'SELECTED') {
                    if (itemsToProcess.length === 0) {
                        GM_log("✅ Finished processing selected items.");
                        break;
                    }
                    targetActionContainer = itemsToProcess.shift(); // Get next item

                    // Verify it still exists in DOM
                    if (!document.body.contains(targetActionContainer)) {
                        GM_log("⚠️ Item no longer in DOM, skipping.");
                        continue;
                    }
                } else {
                    // ALL Mode: Dynamic Query
                    const historyContainer = document.querySelector('div.conversations-container');
                    if (!historyContainer) break;

                    const chatItems = Array.from(historyContainer.querySelectorAll('.conversation-actions-container'));
                    if (chatItems.length === 0) break;

                    // Find first non-pinned
                    for (const item of chatItems) {
                        const previousSibling = item.previousElementSibling;
                        const isPinned = previousSibling && previousSibling.querySelector('.conversation-pin-icon');
                        if (!isPinned) {
                            targetActionContainer = item;
                            break;
                        }
                    }

                    if (!targetActionContainer) {
                        GM_log("✅ No more non-pinned chats found.");
                        break;
                    }
                }

                // --- Perform Deletion on targetActionContainer ---

                // Force visibility
                targetActionContainer.style.visibility = 'visible';
                targetActionContainer.style.opacity = '1';

                const optionsButton = targetActionContainer.querySelector('button[data-test-id="actions-menu-button"]');

                if (!optionsButton) {
                    targetActionContainer.remove(); // Remove stuck element locally if button missing
                    continue;
                }

                // Click "More options"
                optionsButton.click();
                await sleep(500);

                // Find 'Delete' in dropdown menu
                const deleteMenuItem = await waitForElement('div[role="menu"] button:has(mat-icon[data-mat-icon-name="delete"])', 2000, document.body);
                deleteMenuItem.click();
                await sleep(500);

                // Confirm Dialog
                const dialog = await waitForElement('mat-dialog-container', 2000, document.body);
                const confirmBtn = dialog.querySelector('button[data-test-id="confirm-button"]');

                if (!confirmBtn) throw new Error("Confirmation button not found.");

                confirmBtn.click();

                // Wait for response/animation
                await sleep(1200);

                successCount++;
                consecutiveFailures = 0;

                // If in SELECTED mode, remove the checkbox/row from UI if it wasn't automatically removed
                if (mode === 'SELECTED') {
                    // The parent element usually gets removed by Gemini, but we can ensure the checkbox is gone
                    // We don't need to do much as the DOM update should handle it.
                    // But we should remove it from our set.
                    selectedChats.delete(targetActionContainer);
                }

            } catch (error) {
                GM_log(`❌ Error: ${error.message}`);
                failureCount++;
                consecutiveFailures++;

                if (consecutiveFailures > 5) {
                    UI.showToast("Too many consecutive errors. Stopping.", 'error');
                    deletionInProgress = false;
                }

                await sleep(1000);
                if (!deletionInProgress) break;
            }
        }

        deletionInProgress = false;
        selectedChats.clear(); // Clear selection after operation
        updateButtonState();

        if (successCount > 0 || failureCount > 0) {
            UI.showToast(`Deletion Complete! Deleted: ${successCount}, Errors: ${failureCount}`, 'success', 5000);
        } else {
            UI.showToast("No chats found to delete.", 'warning', 5000);
        }
    }

    function stopBulkDelete() {
        if (deletionInProgress) {
            deletionInProgress = false;
            const stopBtn = document.getElementById('stop-delete-btn');
            if (stopBtn) {
                stopBtn.innerHTML = '<span class="bulk-delete-emoji">🛑</span> Stopping...';
                stopBtn.disabled = true;
                UI.showToast("Bulk delete will stop after the current action.", 'info');
            }
        }
    }

    // --- UI Injection ---

    function createUI() {
        // Check if already exists to prevent duplicates
        if (document.getElementById('bulk-delete-controls')) return;

        // Priority 1: The right section container inside the top bar (Standard Gemini Layout)
        let anchorPoint = document.querySelector('.right-section');

        // Priority 2: Fallback to the standard Google Bar header if right-section is missing
        if (!anchorPoint) {
            anchorPoint = document.querySelector('.gb_Rd');
        }

        if (!anchorPoint) return;

        const container = document.createElement('div');
        container.id = 'bulk-delete-controls';

        // Delete Selected Button
        const deleteSelectedBtn = document.createElement('button');
        deleteSelectedBtn.id = 'delete-selected-btn';
        deleteSelectedBtn.className = 'bulk-delete-btn btn-orange';
        deleteSelectedBtn.innerHTML = '<span class="bulk-delete-emoji">✅</span>&nbsp;Delete Selected';
        deleteSelectedBtn.title = "Delete selected chats";
        deleteSelectedBtn.disabled = true; // Disabled by default
        deleteSelectedBtn.onclick = () => startBulkDelete('SELECTED');

        // Start Button (Delete All)
        const startBtn = document.createElement('button');
        startBtn.id = 'start-delete-btn';
        startBtn.className = 'bulk-delete-btn btn-red';
        startBtn.innerHTML = '<span class="bulk-delete-emoji">🔥</span>&nbsp;Delete All';
        startBtn.title = "Delete all chats in sidebar (except pinned chats & Gems)";
        startBtn.onclick = () => startBulkDelete('ALL');

        // Stop Button
        const stopBtn = document.createElement('button');
        stopBtn.id = 'stop-delete-btn';
        stopBtn.className = 'bulk-delete-btn btn-blue';
        stopBtn.innerHTML = '<span class="bulk-delete-emoji">🛑</span> Stop';
        stopBtn.style.display = 'none';
        stopBtn.onclick = stopBulkDelete;

        container.appendChild(deleteSelectedBtn);
        container.appendChild(startBtn);
        container.appendChild(stopBtn);

        // Prepend ensures it sits to the left of the User Profile / Advanced button
        anchorPoint.prepend(container);
    }

    function updateButtonState() {
        const deleteSelected = document.getElementById('delete-selected-btn');
        const start = document.getElementById('start-delete-btn');
        const stop = document.getElementById('stop-delete-btn');

        if (start && stop && deleteSelected) {
            if (deletionInProgress) {
                start.style.display = 'none';
                deleteSelected.style.display = 'none';
                stop.style.display = 'inline-flex';
                stop.disabled = false;
                stop.innerHTML = '<span class="bulk-delete-emoji">🛑</span> Stop';
            } else {
                start.style.display = 'inline-flex';
                start.innerHTML = '<span class="bulk-delete-emoji">🔥</span>&nbsp;Delete All';

                deleteSelected.style.display = 'inline-flex';
                deleteSelected.disabled = selectedChats.size === 0;
                deleteSelected.innerHTML = `<span class="bulk-delete-emoji">✅</span>&nbsp;Delete Selected (${selectedChats.size})`;

                stop.style.display = 'none';
            }
        }
    }

    // --- Initialization ---
    const observer = new MutationObserver((mutations) => {
        // Continuously check if our button is missing (e.g., after page navigation)
        if (!document.getElementById('bulk-delete-controls')) {
            createUI();
        }
        // Also continuously try to inject checkboxes as list loads/scrolls
        injectCheckboxes();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial try
    setTimeout(createUI, 1000);
    setTimeout(injectCheckboxes, 1500);
    setTimeout(createUI, 3000); // Retry for slower connections

})();