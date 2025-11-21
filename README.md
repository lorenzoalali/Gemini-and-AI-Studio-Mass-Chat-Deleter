# Gemini & AI Studio Mass Chat Deleter UserScripts
Automated tools to mass delete (bulk remove) and wipe chat history from Google Gemini and Google AI Studio.

## 📖 Overview
Google does not offer a way to delete multiple chats at once in Gemini or Google AI Studio, and doing it manually can be tedious. This repository hosts two distinct browser UserScripts designed to serve as a comprehensive chat history cleaner for Google's AI platforms. Whether you need to perform a batch deletion of prompts in AI Studio or purge conversations in Gemini, these tools automate the process.

These scripts provide a "Delete All" and "Delete Selected" experience, functioning as a conversation wiper to help you maintain privacy and organization without manually clicking through hundreds of menus.

## 🚀 Features

### Google Gemini Bulk Deleter
*   **Mass Deletion:** One-click solution to clear history by automating the removal of all chats in the sidebar.
*   **Smart DOM Interaction:** Deletes items sequentially without requiring a full page reload for every action.
*   **Safety Stop:** A visible "Stop" button allows you to halt the automated deletion process instantly.
*   **Status Indicators:** Visual emojis indicate when the bulk removal is in progress.

### Google AI Studio Bulk Delete
*   **Batch Deletion:** Wipes the entire library by deleting items in batches and auto-reloading until empty.
*   **Select & Delete:** Adds checkboxes to the interface, allowing for specific mass deletion of selected items.
*   **Master Checkbox:** Select or deselect all visible rows for quick bulk removal.
*   **Auto-Recovery:** Automatically resumes the cleaning process after page reloads to handle large libraries.

## 📥 Download & Installation
To use these tools, you need a UserScript manager such as **Tampermonkey**.

### How to Install
1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Click one of the *Install* links below.
3. Review the script in the new tab and click *Install*.
4. Refresh the Google Gemini or AI Studio page to see the new controls.

You can use these *Greasy Fork* links or copy/paste the source code from *GitHub* into a new User Script from your *Tampermonkey*.
*   **Google AI Studio Bulk Delete:** [Install Link](https://greasyfork.org/en/scripts/555870-google-ai-studio-bulk-delete)
*   **Gemini Bulk Chat Deleter:** [Install Link](https://greasyfork.org/en/scripts/556503-gemini-bulk-chat-deleter)

## 🛠️ Usage

### For Google Gemini
1.  Navigate to the [Gemini app](https://gemini.google.com/app).
2.  Look for the *🔥 Delete All* button in the top-right header area.
3.  Click to start the automated deletion. Confirm the browser dialog.
4.  The script will iterate through your sidebar to wipe all chats.
5.  Click *🛑 Stop* at any time to pause.

### For Google AI Studio
1.  Navigate to your [AI Studio Library](https://aistudio.google.com/library).
2.  **To Wipe Everything:** Click *🔥 Delete All*. The page will reload multiple times as it processes the batch deletion.
3.  **To Delete Specifics:** Check the boxes next to the chats you want to remove, then click *🗑️ Delete Selected*.

## ⚠️ Disclaimer
**Usage At Your Own Risk:**
These scripts are third-party tools and are not affiliated with Google. Using a chat history cleaner is permanent; deleted data cannot be recovered. The author allows you to mass delete content but assumes no responsibility for data loss or account issues.
