// ==UserScript==
// @name         Google AI Studio Bulk Delete
// @namespace    http://tampermonkey.net/
// @version      2025-11-14
// @description  Allows the deletion of several chats at once from the Google AI Studio library webpage.
// @author       Lorenzo Alali
// @match        https://aistudio.google.com/library*
// @grant        none
// @license      MIT
// @run-at       document-idle
// ==/UserScript==

/*
 * =======================================================================
 * --- DISCLAIMER & IMPORTANT INFORMATION ---
 *
 * This tool can be found on https://github.com/lorenzoalali/Google-AI-Studio-Bulk-Delete-UserScript
 *
 * --- HOW THIS SCRIPT WORKS ---
 * This script enhances the Google AI Studio library by adding bulk deletion capabilities.
 *
 * 1.  Bulk Delete All: This feature automates clearing your entire library. After confirmation, it deletes all
 *     visible items in a batch, reloads the page, and continues until the library is empty.
 *
 * 2.  Bulk Delete Selected: Checkboxes are added next to each item, allowing you to select specific chats for
 *     deletion. This process deletes items one-by-one, reloading the page after each deletion, until all
 *     selected items are removed.
 *
 * 3.  Full Control: You can press the "Stop" button at any time to safely halt any ongoing bulk deletion process.
 *
 * 4.  Configurable Delays: The delays between actions can be configured in the "Configuration" section of the script.
 *
 * --- TESTED CONFIGURATION ---
 * This script was tested under the following configuration:
 *   - Operating System: macOS Tahoe 26.1
 *   - Browser: Firefox 145.0
 *   - UserScript Manager: Tampermonkey 5.4.0
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
 *
 * =======================================================================
 */

/*
 * --- LICENSE ---
 *
 * MIT License
 *
 * Copyright (c) 2025 Lorenzo Alali
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without
 * limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions
 * of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
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
        stopButton.style.display = 'inline-block';

        for (let i = 0; i < items.length; i++) {
            if (isStopRequested) {
                sessionStorage.removeItem(aBULK_DELETE_ALL_KEY);
                alert("Bulk delete process stopped by user.");
                break;
            }

            const item = items[i];
            if (!document.body.contains(item)) continue;

            const progressHTML =
                `<span style="font-size: 200%; vertical-align: middle;">🔥</span> Deleting ${i + 1}/${items.length}...`;
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
                '<span style="font-size: 200%; vertical-align: middle;">🔥</span> Delete All';
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
        if (document.getElementById('bulk-delete-all-button')) return;

        const wrapper = document.querySelector('.lib-header .actions-wrapper');
        if (!wrapper) return;

        const btnClass = 'responsive-button-viewport-medium viewport-small-hidden ms-button-primary';

        const bulkDeleteAllButton = document.createElement('button');
        bulkDeleteAllButton.id = 'bulk-delete-all-button';
        bulkDeleteAllButton.innerHTML =
            '<span style="font-size: 200%; vertical-align: middle;">🔥</span> Delete All';
        bulkDeleteAllButton.className = btnClass;
        Object.assign(bulkDeleteAllButton.style, {
            marginLeft: '10px',
            backgroundColor: '#E57373', // Light Red
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '8px 20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s'
        });

        const bulkDeleteSelectedButton = document.createElement('button');
        bulkDeleteSelectedButton.id = 'bulk-delete-selected-button';
        bulkDeleteSelectedButton.innerHTML =
            '<span style="font-size: 200%; vertical-align: middle;">🗑️</span> Delete Selected';
        bulkDeleteSelectedButton.className = btnClass;
        Object.assign(bulkDeleteSelectedButton.style, {
            marginLeft: '10px',
            backgroundColor: '#FFB74D', // Light Orange
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '8px 20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s'
        });

        const stopButton = document.createElement('button');
        stopButton.id = 'stop-bulk-delete-button';
        stopButton.innerHTML =
            '<span style="font-size: 200%; vertical-align: middle;">🛑</span> Stop';
        stopButton.className = btnClass;
        Object.assign(stopButton.style, {
            marginLeft: '10px',
            backgroundColor: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '8px 20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            display: 'none',
            transition: 'background-color 0.2s'
        });

        stopButton.addEventListener('click', () => {
            isStopRequested = true;
            sessionStorage.removeItem(aBULK_DELETE_ALL_KEY);
            sessionStorage.removeItem(aBULK_DELETE_SELECTED_KEY);
            stopButton.innerHTML = '<span style="font-size: 200%; vertical-align: middle;">🛑</span> Stopping...';
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
            stopButton.style.display = 'inline-block';

            const key = aBULK_DELETE_SELECTED_KEY;
            let itemHrefs = JSON.parse(sessionStorage.getItem(key));

            if (itemHrefs.length > 0) {
                const nextHref = itemHrefs[0];
                const linkSelector = `a.name-btn[href="${nextHref}"]`;
                const nextLink = document.querySelector(linkSelector);

                if (nextLink) {
                    const progressHTML =
                        `<span style="font-size: 200%; vertical-align: middle;">🗑️</span> ` +
                        `Deleting ${itemHrefs.length} selected...`;
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
                    '<span style="font-size: 200%; vertical-align: middle;">🗑️</span> Delete Selected';
                stopButton.style.display = 'none';
            }
        }
    }

    const observer = new MutationObserver((mutations, obs) => {
        const wrapper = document.querySelector('.lib-header .actions-wrapper');
        const tableBody = document.querySelector('tbody.mdc-data-table__content');
        if (wrapper) addButtons();
        if (tableBody) addCheckboxesToRows();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
