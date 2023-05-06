(function () {
    const MODE_NORMAL = 0;
    const MODE_DEBUG_SEND_GAS = 1;
    const MODE_DEBUG_GET_PAIFU_JSON = 2;

    const MODE = MODE_DEBUG_GET_PAIFU_JSON;
    const GAS_URL = "https://script.google.com/macros/s/AKfycbybzOa1Gl7EuhQYLV-5moP3pjY3CX_-PYQH7DXUuconS9PGDsSeUIEzRS5kr6lMmeuA/exec";

    async function requestPaifuJson(callback) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(
            tab.id,
            { message: "req" },
            e => { e || alert(e) }
        );
    }

    function sendToGas(json, uuid) {
        fetch(GAS_URL, {
            method: 'post',
        });
    }

    function download(json, uuid) {
        let a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([json], { type: "text/plain" }));
        a.download = "mahjongsoul_paifu_" + uuid + ".json";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    switch (MODE) {
        case MODE_DEBUG_SEND_GAS:
            console.log("send");
            sendToGas("{}");
            return;
        case MODE_DEBUG_GET_PAIFU_JSON:
            console.log("get");
            requestPaifuJson(download);
            return;
    }

    requestPaifuJson(sendToGas);
})();