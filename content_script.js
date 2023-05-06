const injectScript = (filePath, tag) => {
    var node = document.getElementsByTagName(tag)[0];
    var script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", filePath);
    node.appendChild(script);
};

injectScript(chrome.runtime.getURL("paifu.js"), "body");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse(request.message);
    if (request.message == "req") {
        window.postMessage(
            { direction: "ytamaleague-from-page-script", message: "Message from the page" },
            "*"
        );
    }
    return true;
});

window.addEventListener("message", function (event) {
    if (event.data && event.data.direction == "ytamaleague-from-page") {
        chrome.runtime.sendMessage(
            { message: event.data.message },
            function (response) { console.log(response) });
    }
});