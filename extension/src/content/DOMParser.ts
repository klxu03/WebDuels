import { DOMMessageResponse } from '../types/chromeExtension';
import $ from "jquery";


// Function called when a new message is received
const messagesFromReactAppListener = (
   msg: any,
   sender: chrome.runtime.MessageSender,
   sendResponse: (response: DOMMessageResponse) => void) =>{
  
   console.log('[content.js]. Message received', msg);
   console.log("sender:", sender);

   const avatarImg = $('img[alt="Bunny\'s user avatar"]');
   const imageUrl = avatarImg.attr("src") || "imageUrl not found";
 
   const headlines = Array.from(document.getElementsByTagName<"h1">("h1"))
                       .map(h1 => h1.innerText);

    // Prepare the response object with information about the site
    const response: DOMMessageResponse = {
        url: imageUrl,
        title: document.title,
        headlines,
        data: msg.data
    };

    console.log({response});

    sendResponse(response);
    return true;
}
 
console.log("DOMParser content script is running")
/**
* Fired when a message is sent from either an extension process or a content script.
*/
chrome.runtime.onMessage.addListener(messagesFromReactAppListener);
