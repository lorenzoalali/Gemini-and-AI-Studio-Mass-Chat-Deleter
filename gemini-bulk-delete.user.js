// ==UserScript==
// @name         Gemini Bulk Chat Deleter
// @namespace    http://tampermonkey.net/
// @version      2025-11-21-v3
// @description  Bulk delete (mass-remove) chats from Gemini in batch.
// @author       Lorenzo Alali
// @match        https://gemini.google.com/*
// @grant        GM_addStyle
// @grant        GM_log
// @license      MIT
// @homepageURL  https://github.com/lorenzoalali/Gemini-and-AI-Studio-Mass-Chat-Deleter
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
            transition: background-color 0.2s, filter 0.2s;
            height: 36px; /* Match Gemini header button height */
        }
        .bulk-delete-btn:hover {
            filter: brightness(0.9);
        }
        .bulk-delete-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .bulk-delete-emoji {
            font-size: 120%;
            line-height: 1;
        }
        .btn-red { background-color: #B3261E; } /* Material Design Red */
        .btn-blue { background-color: #0B57D0; } /* Material Design Blue */
    `;
    GM_addStyle(css);

    // --- State Variable ---
    let deletionInProgress = false;

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

    // --- Core Deletion Logic ---

    async function startBulkDelete() {
        // Verify Sidebar visibility before starting
        const historyContainerCheck = document.querySelector('div.conversations-container');
        if (!historyContainerCheck) {
            alert("Error: Chat history is not visible.\n\nPlease open the sidebar (click the Menu icon ☰ top-left) to load the chat list, then try again.");
            return;
        }

        if (!confirm("Are you sure you want to permanently delete all chats visible in the sidebar?\n\n(Pinned chats & Gems will be preserved)")) {
            return;
        }

        if (deletionInProgress) return;
        deletionInProgress = true;
        updateButtonState();
        GM_log("▶️ Starting bulk delete...");

        let successCount = 0;
        let failureCount = 0;
        let consecutiveFailures = 0;

        while (deletionInProgress) {
            try {
                // 1. Find the container holding the list (Re-query every loop in case of DOM refresh)
                const historyContainer = document.querySelector('div.conversations-container');

                if (!historyContainer) {
                    GM_log("✅ History container not found. Assuming list is empty.");
                    break;
                }

                // 2. Find the items
                const chatItems = Array.from(historyContainer.querySelectorAll('.conversation-actions-container'));

                if (chatItems.length === 0) {
                    GM_log("✅ No more chats found in container.");
                    break;
                }

                // Find the first NON-PINNED chat
                let targetActionContainer = null;
                for (const item of chatItems) {
                    // The chat title/link is usually the previous sibling of the actions container
                    const previousSibling = item.previousElementSibling;
                    const isPinned = previousSibling && previousSibling.querySelector('.conversation-pin-icon');

                    if (!isPinned) {
                        targetActionContainer = item;
                        break; // Found one to delete
                    }
                }

                if (!targetActionContainer) {
                    GM_log("✅ No more non-pinned chats found.");
                    break;
                }

                // Force visibility
                targetActionContainer.style.visibility = 'visible';
                targetActionContainer.style.opacity = '1';

                const optionsButton = targetActionContainer.querySelector('button[data-test-id="actions-menu-button"]');

                if (!optionsButton) {
                    targetActionContainer.remove(); // Remove stuck element
                    continue;
                }

                // Click "More options"
                optionsButton.click();
                await sleep(500);

                // 3. Find 'Delete' in dropdown menu
                const deleteMenuItem = await waitForElement('div[role="menu"] button:has(mat-icon[data-mat-icon-name="delete"])', 2000, document.body);
                deleteMenuItem.click();
                await sleep(500);

                // 4. Confirm Dialog
                const dialog = await waitForElement('mat-dialog-container', 2000, document.body);
                const confirmBtn = dialog.querySelector('button[data-test-id="confirm-button"]');

                if (!confirmBtn) throw new Error("Confirmation button not found.");

                confirmBtn.click();

                // Wait for response/animation
                await sleep(1200);

                successCount++;
                consecutiveFailures = 0;

            } catch (error) {
                GM_log(`❌ Error: ${error.message}`);
                failureCount++;
                consecutiveFailures++;

                if (consecutiveFailures > 5) {
                    alert("Too many consecutive errors. Stopping.");
                    deletionInProgress = false;
                }

                await sleep(1000);
                if (!deletionInProgress) break;
            }
        }

        deletionInProgress = false;
        updateButtonState();

        if (successCount > 0 || failureCount > 0) {
            alert(`Deletion Complete!\n\n✅ Deleted: ${successCount}\n❌ Errors: ${failureCount}`);
        } else {
            alert("No chats found to delete (or all remaining chats are pinned).");
        }
    }

    function stopBulkDelete() {
        if (deletionInProgress) {
            deletionInProgress = false;
            const stopBtn = document.getElementById('stop-delete-btn');
            if (stopBtn) {
                stopBtn.innerHTML = '<span class="bulk-delete-emoji">🛑</span> Stopping...';
                stopBtn.disabled = true;
            }
        }
    }

    // --- UI Injection ---

    function createUI() {
        // Check if already exists to prevent duplicates
        if (document.getElementById('bulk-delete-controls')) return;

        // Priority 1: The right section container inside the top bar (Standard Gemini Layout)
        // Based on your HTML: <div class="right-section"> inside <top-bar-actions>
        let anchorPoint = document.querySelector('.right-section');

        // Priority 2: Fallback to the standard Google Bar header if right-section is missing
        if (!anchorPoint) {
            anchorPoint = document.querySelector('.gb_Rd');
        }

        if (!anchorPoint) return;

        const container = document.createElement('div');
        container.id = 'bulk-delete-controls';

        // Start Button
        const startBtn = document.createElement('button');
        startBtn.id = 'start-delete-btn';
        startBtn.className = 'bulk-delete-btn btn-red';
        startBtn.innerHTML = '<span class="bulk-delete-emoji">🔥</span>&nbsp;Delete All';
        startBtn.title = "Delete all chats in sidebar (except pinned chats & Gems)";
        startBtn.onclick = startBulkDelete;

        // Stop Button
        const stopBtn = document.createElement('button');
        stopBtn.id = 'stop-delete-btn';
        stopBtn.className = 'bulk-delete-btn btn-blue';
        stopBtn.innerHTML = '<span class="bulk-delete-emoji">🛑</span> Stop';
        stopBtn.style.display = 'none';
        stopBtn.onclick = stopBulkDelete;

        container.appendChild(startBtn);
        container.appendChild(stopBtn);

        // Prepend ensures it sits to the left of the User Profile / Advanced button
        anchorPoint.prepend(container);
    }

    function updateButtonState() {
        const start = document.getElementById('start-delete-btn');
        const stop = document.getElementById('stop-delete-btn');

        if (start && stop) {
            if (deletionInProgress) {
                start.style.display = 'none';
                stop.style.display = 'inline-flex';
                stop.disabled = false;
                stop.innerHTML = '<span class="bulk-delete-emoji">🛑</span> Stop';
            } else {
                start.style.display = 'inline-flex';
                start.innerHTML = '<span class="bulk-delete-emoji">🔥</span>&nbsp;Delete All';
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
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial try
    setTimeout(createUI, 1000);
    setTimeout(createUI, 3000); // Retry for slower connections

})();
