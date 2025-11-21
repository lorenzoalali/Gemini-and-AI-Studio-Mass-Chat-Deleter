// ==UserScript==
// @name         Google AI Studio Bulk Delete
// @namespace    http://tampermonkey.net/
// @version      2025-11-21
// @description  Bulk delete (mass-remove) chats from Google AI Studio in batch.
// @author       Lorenzo Alali
// @match        https://aistudio.google.com/*
// @grant        none
// @license      MIT
// @homepageURL  https://github.com/lorenzoalali/Gemini-and-AI-Studio-Mass-Chat-Deleter
// @run-at       document-idle
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

(function() {
    'use strict';

    // --- State Management ---
    const aBULK_DELETE_ALL_KEY = 'isAiStudioBulkDeletingAll';
    const aBULK_DELETE_SELECTED_KEY = 'isAiStudioBulkDeletingSelected';
    let isStopRequested = false;

    // --- Configuration ---
    const aDELAY_BETWEEN_ACTIONS = 500;
    const aDELAY_AFTER_DELETION = 1500;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
    async function processBatchDeletion(
        items,
        bulkDeleteAllButton,
        bulkDeleteSelectedButton,
        stopButton
    ) {
        bulkDeleteAllButton.disabled = true;
        bulkDeleteSelectedButton.disabled = true;
        stopButton.style.display = 'inline-flex';

        for (let i = 0; i < items.length; i++) {
            if (isStopRequested) {
                sessionStorage.removeItem(aBULK_DELETE_ALL_KEY);
                alert("Bulk delete process stopped by user.");
                break;
            }

            const item = items[i];
            if (!document.body.contains(item)) continue;

            const progressHTML =
                `<span style="font-size: 1.2em;">🔥</span> <span>Deleting ${i + 1}/${items.length}...</span>`;
            bulkDeleteAllButton.innerHTML = progressHTML;

            item.click();
            await sleep(aDELAY_BETWEEN_ACTIONS);

            const delMenu = await findAndClickByText(
                'button[role="menuitem"]',
                ['Delete']
            );
            if (!delMenu) {
                document.querySelector('.cdk-overlay-backdrop')?.click();
                continue;
            }
            await sleep(aDELAY_BETWEEN_ACTIONS);

            const delConfirm = await findAndClickByText(
                '.mat-mdc-dialog-actions button',
                ['Delete']
            );
            if (!delConfirm) {
                document.querySelector('.cdk-overlay-backdrop')?.click();
                continue;
            }

            await sleep(aDELAY_AFTER_DELETION);
        }

        if (!isStopRequested) {
            location.reload();
        } else {
            bulkDeleteAllButton.disabled = false;
            bulkDeleteSelectedButton.disabled = false;
            bulkDeleteAllButton.innerHTML =
                `<span style="font-size: 1.2em;">🔥</span> <span>Delete All</span>`;
            stopButton.style.display = 'none';
        }
    }


    /**
     * Deletes a single item and triggers a page reload.
     */
    async function deleteSingleItemAndReload(itemMenuButton, onComplete) {
        if (!document.body.contains(itemMenuButton)) return;

        itemMenuButton.click();
        await sleep(aDELAY_BETWEEN_ACTIONS);

        const delMenu = await findAndClickByText(
            'button[role="menuitem"]',
            ['Delete']
        );
        if (!delMenu) {
            document.querySelector('.cdk-overlay-backdrop')?.click();
            return;
        }
        await sleep(aDELAY_BETWEEN_ACTIONS);

        const delConfirm = await findAndClickByText(
            '.mat-mdc-dialog-actions button',
            ['Delete']
        );
        if (!delConfirm) {
            document.querySelector('.cdk-overlay-backdrop')?.click();
            return;
        }

        await sleep(aDELAY_AFTER_DELETION);

        if (onComplete) onComplete();
        if (!isStopRequested) location.reload();
    }

    /**
     * Starts the 'Bulk Delete All' process.
     */
    function startBulkDeleteAll(
        bulkDeleteAllButton,
        bulkDeleteSelectedButton,
        stopButton,
        isAutoStart = false
    ) {
        const query = 'ms-prompt-options-menu button[aria-label="More options"]';
        const items = document.querySelectorAll(query);
        if (items.length === 0) {
            sessionStorage.removeItem(aBULK_DELETE_ALL_KEY);
            alert("Bulk delete complete. Your library is now empty.");
            return;
        }

        if (!isAutoStart) {
            const confirmMsg =
                "This will bulk-delete ALL items in your history.\n\n" +
                "It will delete items in batches of 5, reload the page, and " +
                "continue until finished.\n\nAre you sure you want to proceed?";
            const userConfirmation = confirm(confirmMsg);
            if (!userConfirmation) return;
            sessionStorage.setItem(aBULK_DELETE_ALL_KEY, 'true');
        }

        processBatchDeletion(
            Array.from(items),
            bulkDeleteAllButton,
            bulkDeleteSelectedButton,
            stopButton
        );
    }

    /**
     * Starts the 'Bulk Delete Selected' process.
     */
    function startBulkDeleteSelected() {
        sessionStorage.removeItem(aBULK_DELETE_ALL_KEY); // Safety clear

        const selector = '.bulk-delete-checkbox:checked';
        const selectedCheckboxes = document.querySelectorAll(selector);
        if (selectedCheckboxes.length === 0) {
            alert("No items selected for deletion.");
            return;
        }

        const confirmMsg = `Are you sure you want to delete the ${selectedCheckboxes.length} selected item(s)?`;
        const userConfirmation = confirm(confirmMsg);
        if (!userConfirmation) return;

        const itemHrefs = Array.from(selectedCheckboxes).map(cb => {
            const link = cb.closest('tr').querySelector('a.name-btn');
            return link ? link.getAttribute('href') : null;
        }).filter(Boolean);

        const key = aBULK_DELETE_SELECTED_KEY;
        sessionStorage.setItem(key, JSON.stringify(itemHrefs));
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
        if (document.getElementById('bulk-delete-all-button')) return;

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
            stopButton.innerHTML = `<span style="font-size: 1.2em;">🛑</span> <span>Stopping...</span>`;
            stopButton.disabled = true;
            alert(
                "Bulk delete will stop. The page will not reload " +
                "after the current action."
            );
        });

        bulkDeleteAllButton.addEventListener('click', () =>
            startBulkDeleteAll(
                bulkDeleteAllButton,
                bulkDeleteSelectedButton,
                stopButton,
                false
            )
        );
        bulkDeleteSelectedButton.addEventListener('click', () =>
            startBulkDeleteSelected()
        );

        // Append to DOM
        wrapper.appendChild(bulkDeleteSelectedButton);
        wrapper.appendChild(bulkDeleteAllButton);
        wrapper.appendChild(stopButton);

        setTimeout(() => handleAutoDeletion(
            bulkDeleteAllButton,
            bulkDeleteSelectedButton,
            stopButton
        ), 2000);
    }

    /**
     * Checks session storage on page load and continues any pending
     * deletion process.
     */
    function handleAutoDeletion(
        bulkDeleteAllButton,
        bulkDeleteSelectedButton,
        stopButton
    ) {
        if (sessionStorage.getItem(aBULK_DELETE_ALL_KEY) === 'true') {
            startBulkDeleteAll(
                bulkDeleteAllButton,
                bulkDeleteSelectedButton,
                stopButton,
                true
            );

        } else if (sessionStorage.getItem(aBULK_DELETE_SELECTED_KEY)) {
            bulkDeleteAllButton.disabled = true;
            bulkDeleteSelectedButton.disabled = true;
            stopButton.style.display = 'inline-flex'; // Flex for alignment

            const key = aBULK_DELETE_SELECTED_KEY;
            let itemHrefs = JSON.parse(sessionStorage.getItem(key));

            if (itemHrefs.length > 0) {
                const nextHref = itemHrefs[0];
                const linkSelector = `a.name-btn[href="${nextHref}"]`;
                const nextLink = document.querySelector(linkSelector);

                if (nextLink) {
                    const progressHTML =
                        `<span style="font-size: 1.2em;">🗑️</span> ` +
                        `<span>Deleting ${itemHrefs.length} selected...</span>`;
                    bulkDeleteSelectedButton.innerHTML = progressHTML;
                    const itemMenu = nextLink.closest('tr')
                        .querySelector('ms-prompt-options-menu button');

                    deleteSingleItemAndReload(itemMenu, () => {
                        itemHrefs.shift(); // Remove processed item
                        if (itemHrefs.length > 0) {
                            sessionStorage.setItem(key, JSON.stringify(itemHrefs));
                        } else {
                            sessionStorage.removeItem(key);
                        }
                    });
                } else {
                    console.warn(
                        `Item with href ${nextHref} not found. Checking next...`
                    );
                    itemHrefs.shift();
                    sessionStorage.setItem(key, JSON.stringify(itemHrefs));
                    location.reload();
                }
            } else {
                sessionStorage.removeItem(key);
                alert("Selected items have been deleted.");
                bulkDeleteAllButton.disabled = false;
                bulkDeleteSelectedButton.disabled = false;
                bulkDeleteSelectedButton.innerHTML =
                    `<span style="font-size: 1.2em;">🗑️</span> <span>Delete Selected</span>`;
                stopButton.style.display = 'none';
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
