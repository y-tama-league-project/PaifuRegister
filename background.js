const GAS_URL = "https://script.google.com/macros/s/AKfycbxfsuVqGYkjQ4CwSqc8bQZHmcnek73u3Z1H_0I7pdWSBHjoJYSieEaEKMOPLllfa34u/exec";

async function requestPaifuJson() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(
        tab.id,
        { message: "req" },
        e => { 
            const option = {
                title: "牌譜登録",
                type: "basic",
                message: "エラーが発生しました",
                iconUrl: "icons/icon_48.png"
            };
            e || chrome.notifications.create(option);
        }
    );
}

function sendToGas(json, uuid) {    
    fetch(GAS_URL, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: json
    })
    .then(_ => {
        chrome.notifications.create({
            title: "牌譜登録",
            type: "basic",
            message: "牌譜情報を送信しました",
            iconUrl: "icons/icon_48.png"
        });
    })
    .catch(_ => {
        chrome.notifications.create({
            title: "牌譜登録",
            type: "basic",
            message: "牌譜情報を送信した際にエラーが発生しました",
            iconUrl: "icons/icon_48.png"
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse(request);
    if (request.message.json) {
        sendToGas(request.message.json, request.message.uuid);
    }
});

chrome.action.onClicked.addListener((tab) => {
    requestPaifuJson();
});