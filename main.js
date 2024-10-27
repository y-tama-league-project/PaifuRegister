// ==UserScript==
// @name         わいたま牌譜登録
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  わいたまりーぐの牌譜を登録します
// @match        https://game.mahjongsoul.com/*
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @run-at       context-menu
// ==/UserScript==

(function() {
    'use strict';

    // Project: https://script.google.com/home/projects/11517jt0Cpgf26qHeaPguGMnNwKVuURB9b8x-dY25PKr1S5eim5XZ-7kQ
    const GAS_URL = "https://script.google.com/macros/s/AKfycbz9wX_tCKfYS7SaxmPXoQ_dzG87C8Hue3MrmFMmHePNyBBmN4_CfGpU5nTFC3yDEXiW/exec";

    // 入力パターンは以下の6パターンに対応
    // 雀魂牌譜: https://game.mahjongsoul.com/?paipu={UUID}_aXXXXXXXXX
    // 雀魂牌譜: https://game.mahjongsoul.com/?paipu={UUID}
    // https://game.mahjongsoul.com/?paipu={UUID}_aXXXXXXXXX
    // https://game.mahjongsoul.com/?paipu={UUID}
    // {UUID}_aXXXXXXXXX
    // {UUID}
    const input_text = prompt("第3シーズンの牌譜を登録します\n牌譜URL(UUID)を入力してください");
    const match = input_text.match(/^(雀魂牌譜: )?(https:\/\/game.mahjongsoul.com\/\?paipu=)?(\d+(-[0-9a-f]+){5})(_a\d+)?$/);
    if (!match) {
        alert("牌譜URL(UUID)を入力してください");
        return;
    }

    const uuid = match[3];
    console.log(`UUID:${uuid}`);

    const pbWrapper = net.ProtobufManager.lookupType(".lq.Wrapper");
    const pbGameDetailRecords = net.ProtobufManager.lookupType(".lq.GameDetailRecords");
    function parseRecords(gameDetailRecords, json) {
        try {
            if (gameDetailRecords.version == 0) {
                for (let i in gameDetailRecords.records) {
                    const record = (pbWrapper.decode(gameDetailRecords.records[i]));
                    const pb = net.ProtobufManager.lookupType(record.name);
                    const data = JSON.parse(JSON.stringify((pb.decode(record.data))));
                    json.records[i] = { name: record.name, data: data };
                }
            }
            else if (gameDetailRecords.version == 210715) {
                for (let i in gameDetailRecords.actions) {
                    if (gameDetailRecords.actions[i].type == 1) {
                        const record = (pbWrapper.decode(gameDetailRecords.actions[i].result));
                        const pb = net.ProtobufManager.lookupType(record.name);
                        const data = JSON.parse(JSON.stringify((pb.decode(record.data))));
                        json.actions[i].result = { name: record.name, data: data };
                    }
                };
            }
            else {
                throw ("Unknown version: " + gameDetailRecords.version);
            }
        }
        catch (e) {
            console.log(e);
        }
        return json;
    }
    async function fetchData(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }
    function sendToGas(json) {
        const response = GM_xmlhttpRequest({
            url: GAS_URL,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: json,
            onload: response => {
                GM_notification("牌譜登録", `牌譜情報を送信しました\nUUID:${uuid}`, null, null);
            },
            onerror: e => {
                GM_notification("牌譜登録", `牌譜情報の送信時にエラーが発生しました\nUUID${uuid}`, null, null)
                console.error(e);
            }
        });
    }
    app.NetAgent.sendReq2Lobby(
        "Lobby",
        "fetchGameRecord",
        { game_uuid: uuid, client_version_string: GameMgr.Inst.getClientVersion() },
        async function (error, gameRecord) {
            if (gameRecord.data == "") {
                gameRecord.data = await fetchData(gameRecord.data_url);
            }
            const gameDetailRecordsWrapper = pbWrapper.decode(gameRecord.data);
            const gameDetailRecords = pbGameDetailRecords.decode(gameDetailRecordsWrapper.data);
            let gameDetailRecordsJson = JSON.parse(JSON.stringify(gameDetailRecords));
            gameDetailRecordsJson = parseRecords(gameDetailRecords, gameDetailRecordsJson);
            gameRecord.data = "";
            let gameRecordJson = JSON.parse(JSON.stringify(gameRecord));
            gameRecordJson.data = { name: gameDetailRecordsWrapper.name, data: gameDetailRecordsJson };
            sendToGas(JSON.stringify(gameRecordJson, null, "  "));
        });
})();
