# Google AI Studio Bulk Delete UserScript

This User Script for your web browser enhances the Google AI Studio library webpage by adding bulk deletion functionalities. Easily manage your chat history with options to delete all items at once or select specific items for removal.

## About this tool

This script was developed to streamline the process of cleaning up the Google AI Studio library. Manually deleting a large number of chats can be a tedious and time-consuming task. This script automates the process, providing a much-needed "Bulk Delete All" and "Bulk Delete Selected" functionality, complete with a safe-stop mechanism and auto-reloading to handle large libraries efficiently.

## Features

*   **Bulk Delete All:** A one-click solution to clear your entire Google AI Studio library. The script deletes items in batches and reloads the page, continuing the process until the library is empty.
*   **Bulk Delete Selected:** Adds checkboxes to each item in your library, allowing you to select and delete multiple specific chats at once.
*   **Auto-Reloading:** For both bulk-delete functions, the script automatically reloads the page to continue the deletion process, ensuring it can handle libraries of any size.
*   **Stop Button:** A clearly visible "Stop" button allows you to safely halt any ongoing bulk deletion process at any time.
*   **Configurable Delays:** You can customize the delays between deletion actions to suit your preferences by modifying the script's configuration variables.
*   **Select/Deselect All:** A master checkbox in the header allows you to select or deselect all visible items with a single click.

## How to install

To use this script, you need a UserScript manager extension for your web browser, such as [Tampermonkey](https://www.tampermonkey.net/) (available for Chrome, Firefox, Edge, Safari, and more).

Once installed:

1.  Create a new script in your manager's dashboard.
2.  Copy the entire content of the `google-ai-studio-bulk-delete.user.js` file from this repository.
3.  Paste the code into the new script editor.
4.  Save the script. It will automatically be active when you visit the Google AI Studio library.

## Testing Environment

This script was tested under the following configuration:
*   **Operating System:** macOS Tahoe 26.1
*   **Browser:** Firefox 145.0
*   **UserScript Manager:** Tampermonkey 5.4.0

## How to use

After installing the script, navigate to your [Google AI Studio Library](https://aistudio.google.com/library). You will see new buttons and checkboxes added to the interface.

### How this script works

1.  **Bulk Delete All**: This feature automates clearing your entire library. After confirmation, it deletes all visible items in a batch, reloads the page, and continues until the library is empty.

2.  **Bulk Delete Selected**: Checkboxes are added next to each item, allowing you to select specific chats for deletion. This process deletes items one-by-one, reloading the page after each deletion, until all selected items are removed.

3.  **Full Control**: You can press the "Stop" button at any time to safely halt any ongoing bulk deletion process.

4.  **Configurable Delays**: The delays between actions can be configured in the "Configuration" section of the script.

### Bulk Delete All

1.  Click the **🔥 Delete All** button.
2.  A confirmation dialog will appear, explaining the process. Click **OK** to proceed.
3.  The script will begin deleting all visible items, showing progress on the button. The page will reload and continue until the library is empty.
4.  To stop the process, click the **🛑 Stop** button at any time.

### Bulk Delete Selected

1.  Use the checkboxes that appear on the left of each item to select the chats you wish to delete. You can use the master checkbox in the table header to select or deselect all visible items.
2.  Click the **🗑️ Delete Selected** button.
3.  A confirmation dialog will ask you to confirm the deletion of the selected items. Click **OK**.
4.  The script will delete the selected items one by one, reloading the page after each deletion until all are removed.
5.  To halt the process, click the **🛑 Stop** button.

## Configuration

You can adjust the timing of the script's actions by editing these variables at the top of the script file:

*   `aDELAY_BETWEEN_ACTIONS`: The delay in milliseconds between clicks (e.g., clicking the "More options" menu and then clicking the "Delete" button). Default is `500`.
*   `aDELAY_AFTER_DELETION`: The delay in milliseconds after confirming a deletion before the page reloads. Default is `1500`.

## Disclaimer & Important Information

### Usage At Your Own Risk
The author provides no guarantees regarding the performance, safety, or functionality of this script. You assume all risks associated with its use. The author offers no support and is not responsible for any potential data loss or issues that may arise.

### Future Compatibility
This script's operation depends on the current Document Object Model (DOM) of the Google AI Studio platform. Modifications to the website by Google are likely to render this script non-functional in the future. While the author does not plan on providing proactive updates or support, contributions in the form of GitHub pull requests are welcome.
