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
        captureFullPageScreenshot();
        return;
    }

    return true;  // Keeps the message channel open
});

async function captureFullPageScreenshot() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id || !tab.url) return;

    const url = tab.url;
    const domain = new URL(url).hostname;
    console.log({domain})

    // Inject code to collect storage data
    const storageData = await getStorageData(tab.id);

    // Get cookies
    const cookies = await getCookies(domain);

    // Send data to the server
    const screenshotBlob = await sendDataToServer(url, cookies, storageData);

    // Convert Blob to base64
    const base64data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(screenshotBlob);
    });

    // Generate a filename based on the current date and time
    const filename = `screenshot_${new Date().toISOString().replace(/:/g, '-')}.png`;

    // Use chrome.downloads.download to save the file
    chrome.downloads.download({
      url: base64data,
      filename: filename,
      saveAs: false // Set to true if you want the user to choose the save location
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
      } else {
        console.log('Download started with ID:', downloadId);
      }
    });


  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
}

function getStorageData(tabId: number): Promise<{ localStorage: Record<string, string>; sessionStorage: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          const local: Record<string, string> = {};
          const session: Record<string, string> = {};

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              local[key] = localStorage.getItem(key) || '';
            }
          }

          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
              session[key] = sessionStorage.getItem(key) || '';
            }
          }

          return { localStorage: local, sessionStorage: session };
        },
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (
          injectionResults &&
          injectionResults.length > 0 &&
          injectionResults[0].result
        ) {
          resolve(injectionResults[0].result);
        } else {
          reject(new Error('Failed to retrieve storage data'));
        }
      }
    );
  });
}

function getCookies(domain: string): Promise<any[]> {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ domain }, (cookies) => {
      const formattedCookies = cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expirationDate,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite === 'no_restriction' ? 'None' :
                  cookie.sameSite === 'lax' ? 'Lax' :
                  cookie.sameSite === 'strict' ? 'Strict' :
                  undefined
      }));
      resolve(formattedCookies);
    });
  });
}

async function sendDataToServer(
  url: string,
  cookies: any[],
  storageData: { localStorage: Record<string, string>; sessionStorage: Record<string, string> }
): Promise<Blob> {
  const response = await fetch('http://localhost:3000/screenshot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      cookies,
      localStorage: storageData.localStorage,
      sessionStorage: storageData.sessionStorage,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get screenshot from server');
  }

  return await response.blob();
}