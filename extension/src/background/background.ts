// Log when the service worker is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log("Background script installed");
});

// promise to fetch pokemon ditto properties
const fetchPokemonData = async () => {
  const apiUrl = "https://pokeapi.co/api/v2/pokemon/ditto/";
  const response = await fetch(apiUrl);
  const data = await response.json();
  console.log({data});
  return data;
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("sender", sender, "sent a request", request)

    if (request.type === "GET_DOM") {
        // Query for the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs.length === 0 || !tabs[0].id) {
            sendResponse({ status: "No active tab" });
            return;
        }
        console.log("tab id", tabs[0].id)

        const data = await fetchPokemonData();

        // Send a message to the content script in the active tab
        chrome.tabs.sendMessage(tabs[0].id, { type: "GET_DOM", data, tabId: tabs[0].id }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error from content script:", chrome.runtime.lastError.message);
                sendResponse({ status: "Error", error: chrome.runtime.lastError.message });
            } else {
                console.log("Response from content script:", response);
                sendResponse(response);
            }
        });

        return true;  // Keeps the message channel open for async response
        });
    } else if (request.type === "PING") {
        console.log("Received PING from content script, PONGing back");
        chrome.tabs.sendMessage(request.tabId, { type: "PONG" });

        return true;
    } else if (request.type === "TAKE_SCREENSHOT") {
        console.log("Received TAKE_SCREENSHOT to background");
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const tab = tabs[0];
            if (tab.id) {
                chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
                    chrome.tabs.sendMessage(tab.id!, { action: "processScreenshot", dataUrl})
                });
            }
        })
    } else if (request.type === "TAKE_FULL_PAGE_SCREENSHOT") {
        return;
    }

    return true;  // Keeps the message channel open
});