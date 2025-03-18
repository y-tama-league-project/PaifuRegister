// ==UserScript==
// @name         わいたま牌譜登録
// @icon         https://github.com/y-tama-league-project/PaifuRegister/raw/master/icons/icon_128.png
// @author       MAX
// @version      4.1.0
// @description  わいたまりーぐの牌譜を登録します
// @match        https://game.mahjongsoul.com/*
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @run-at       context-menu
// @updateURL    https://github.com/y-tama-league-project/PaifuRegister/raw/master/main.js
// @downloadURL  https://github.com/y-tama-league-project/PaifuRegister/raw/master/main.js
// ==/UserScript==

(function () {
    'use strict';

    const GAS_URL = "https://script.google.com/macros/s/AKfycbzDzfTehawROhitJl-fIw4I7Vw8oRup-qFmJ4Lrqvcvt8DQsa2K9WnuT5pj5NqzFX-f/exec?p=game/register-game-result";

    // Utility function to create and style an element
    function createElement(tag, styles = {}, attributes = {}) {
        const element = document.createElement(tag);
        Object.assign(element.style, styles);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        return element;
    }

    // Show input dialog
    function showInputDialog(onSubmit) {
        const dialog = createElement('div', {
            position: 'fixed',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -30%)',
            padding: '30px',
            backgroundColor: '#333',
            color: '#e0e0e0',
            border: '1px solid #444',
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
            zIndex: '9999',
            width: '90%',
            maxWidth: '500px',
            overflow: 'hidden',
        });

        const header = createElement('h2', { marginTop: '0', marginBottom: '20px' });
        header.innerText = '第4シーズンの牌譜を登録します\n牌譜URL(UUID)を入力してください';

        const closeButton = createElement('button', {
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#444',
            color: '#e0e0e0',
            border: 'none',
            padding: '5px 10px',
            cursor: 'pointer',
        });
        closeButton.innerText = 'Close';
        closeButton.onclick = () => document.body.removeChild(dialog);

        const dropdown = createElement('select', {
            width: '100%',
            marginBottom: '10px',
            backgroundColor: '#444',
            color: '#e0e0e0',
            fontSize: '20px',
        });
        ['1試合目A卓', '1試合目B卓', '1試合目C卓', '2試合目A卓', '2試合目B卓', '2試合目C卓', 'TEST'].forEach(optionText => {
            const option = createElement('option');
            option.value = optionText;
            option.text = optionText;
            dropdown.appendChild(option);
        });

        const textInput = createElement('input', {
            width: '100%',
            marginBottom: '10px',
            backgroundColor: '#444',
            color: '#e0e0e0',
            border: '1px solid #555',
            padding: '5px',
        }, { type: 'text', placeholder: '牌譜URL(UUID)を入力してください' });

        const submitButton = createElement('button', {
            width: '100%',
            backgroundColor: '#444',
            color: '#e0e0e0',
            border: 'none',
            padding: '10px',
            cursor: 'pointer',
            marginTop: '10px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        });
        submitButton.innerText = '送信';
        submitButton.onclick = () => handleDialogSubmit(dropdown, textInput, onSubmit, dialog);

        dialog.append(closeButton, header, dropdown, textInput, submitButton);
        document.body.appendChild(dialog);
    }

    function handleDialogSubmit(dropdown, textInput, onSubmit, dialog) {
        const games = [
            { match: 1, table: 1 },
            { match: 1, table: 2 },
            { match: 1, table: 3 },
            { match: 2, table: 1 },
            { match: 2, table: 2 },
            { match: 2, table: 3 },
            { match: 0, table: 0 },
        ];
        const dropdownIndex = dropdown.selectedIndex;
        const selectedMatch = games[dropdownIndex];

        const url = textInput.value;
        const match = url.match(/^(雀魂牌譜:\s*)?(https:\/\/game.mahjongsoul.com\/\?paipu=)?(\d+(-[0-9a-f]+){5})(_a\d+)?$/);
        if (!match) {
            alert("牌譜URL(UUID)の形式が正しくありません");
            document.body.removeChild(dialog);
            return;
        }
        const uuid = match[3];
        onSubmit(selectedMatch.match, selectedMatch.table, uuid);
        document.body.removeChild(dialog);
    }

    async function fetchData(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }

    function parseRecords(gameDetailRecords, json, pbWrapper) {
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

    function getPaifu(uuid, onSuccess) {
        const pbWrapper = net.ProtobufManager.lookupType(".lq.Wrapper");
        const pbGameDetailRecords = net.ProtobufManager.lookupType(".lq.GameDetailRecords");

        app.NetAgent.sendReq2Lobby(
            "Lobby",
            "fetchGameRecord",
            { game_uuid: uuid, client_version_string: GameMgr.Inst.getClientVersion() },
            async (error, gameRecord) => {
                if (gameRecord.data == "") {
                    gameRecord.data = await fetchData(gameRecord.data_url);
                }
                const gameDetailRecordsWrapper = pbWrapper.decode(gameRecord.data);
                const gameDetailRecords = pbGameDetailRecords.decode(gameDetailRecordsWrapper.data);
                let gameDetailRecordsJson = JSON.parse(JSON.stringify(gameDetailRecords));

                gameDetailRecordsJson = parseRecords(gameDetailRecords, gameDetailRecordsJson, pbWrapper);
                gameRecord.data = "";

                let gameRecordJson = JSON.parse(JSON.stringify(gameRecord));
                gameRecordJson.data = { name: gameDetailRecordsWrapper.name, data: gameDetailRecordsJson };
                onSuccess(gameRecordJson);
            }
        );
    }

    function register(match, table, paifu) {
        const json = JSON.stringify(paifu, null);
        let url = GAS_URL;
        if (match !== 0 && table !== 0) {
            url += `&match=${match}&table=${table}`;
        }
        GM_xmlhttpRequest({
            url: url,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: json,
            onload: () => {
                GM_notification("牌譜登録", "牌譜情報を送信しました", "https://github.com/y-tama-league-project/PaifuRegister/raw/master/icons/icon_128.png");
            },
            onerror: (e) => {
                GM_notification("牌譜登録", "牌譜情報の送信時にエラーが発生しました", "https://github.com/y-tama-league-project/PaifuRegister/raw/master/icons/icon_128.png");
                console.error(e);
            },
        });
    }

    // Main execution
    showInputDialog((match, table, uuid) => {
        getPaifu(uuid, (paifu) => {
            register(match, table, paifu);
        });
    });
})();
