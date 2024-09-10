let fullPageScreenshot: string[] = [];

console.log("ScreenshotHandler loaded");
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "processScreenshot") {
        console.log("Processing screenshot")
        saveToClipboard(msg.dataUrl);
        sendResponse(sender);

        return true
    }
});

const saveToClipboard = async (dataUrl: string) => {
    fullPageScreenshot.push(dataUrl);

    try {
        const finalDataUrl = await combineScreenshots();
        downloadScreenshot(finalDataUrl);
        console.log("Screenshot downloaded");
        fullPageScreenshot = [];
    } catch (err) {
        console.error("Error saving screenshot to clipboard:", err);
    }
}

const combineScreenshots = async () => { // does this return a string, or a Promise<string>?
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let height = 0;
    let maxWidth = 0;

    const images = fullPageScreenshot.map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });

    await Promise.all(images.map(img => img.decode()));

    images.forEach(img => {
        height += img.height;
        maxWidth = Math.max(maxWidth, img.width);
    });

    canvas.width = maxWidth;
    canvas.height = height;

    let yOffset = 0;
    images.forEach(img => {
        ctx!.drawImage(img, 0, yOffset);
        yOffset += img.height;
    });

    return canvas.toDataURL("image/png");
}

const downloadScreenshot = (dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `screenshot_${new Date().toISOString()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}