/**
 * CDS Vyatka Monotoring screen for KAT
 * Public transportation monitoring board from CDS on two route directions for Kirov Aviation Technical School
 *
 * Author: @xenongee
 * Created: 01.03.2024
 * Last update: 27.04.2024
 */
const doc = document;
const url = "https://map.cdsvyatka.com/avia/";
const fnGosNum = true;
const fnSortByTime = false;
const tbl = "#cds-table";
const tblCol = "#column";
const tblRow = "#row";
const tblColTemplate = "#cds-table-col-template";
const tblRowTemplate = "#cds-table-row-template";
const tableColumns = {
    train: { prefix: "#column-train", kod: "261", header: "В сторону Ж/Д" },
    folk: { prefix: "#column-folk", kod: "262", header: "В сторону ОДНТ" },
};
const tableRows = {
    marsh: { prefix: "#content-bus #bus", updateAnim: false },
    gosnum: { prefix: "#content-bus #gosnum", updateAnim: false },
    minutes: { prefix: "#content-time", updateAnim: true },
};
const dateOptions = { dateStyle: "short", timeStyle: "medium" };
const processTick = 30000; // 30 seconds
const processTickWhenError = 300000; // 5 minutes
let intervalProcess, intervalClock, currentDate, pastDate, temp;
let updateInFlight = false;

async function getData(url) {
    const response = await fetch(url).catch((err) => {
        showMsg('Невозможно получить данные от ЦДС ГПТ. Ошибка:', err, "Скорее всего, проблема на стороне ЦДС ГПТ (Центральная диспетчерская служба городского пассажирского транспорта)");
        throw new Error(err);
    });
    if (!response.ok) {
        let err = `${response.status} ${response.statusText}`;
        showMsg('Статус HTTP:', err);
        throw new Error(response.status);
    }
    const data = response.json().catch((err) => {
        showMsg('Данные не в формате JSON:', err, "Возможно, отсутствует транспорт на пути следования. Если это не так, сообщите в ИВЦ о данной ошибке.");
        throw new Error(err);
    });
    return data;
}

function prepareData(data) {
    const dataVirtual = structuredClone(tableColumns);
    for (const col of Object.keys(tableColumns)) {
        dataVirtual[col].prefix = undefined;
        dataVirtual[col].kod = undefined;
        dataVirtual[col] = [];
    }
    if (fnSortByTime) {
        data.sort((a, b) => a.minutes - b.minutes);
    } else {
        data.sort((a, b) => {
            const aMarsh = String(a.marsh);
            const bMarsh = String(b.marsh);
            const aTrolleybus = aMarsh.endsWith("т");
            const bTrolleybus = bMarsh.endsWith("т");
            if (aTrolleybus !== bTrolleybus) return aTrolleybus ? 1 : -1;
            return Number.parseInt(aMarsh, 10) - Number.parseInt(bMarsh, 10);
        });
    }
    const dataPrepared = data.reduce((acc, el) => {
        const key = Object.keys(tableColumns).find((col) => el.kod === tableColumns[col].kod);
        if (!(key in tableColumns)) {
            showMsg(`Код маршрута не существует: <br><small>${escapeHtml(String(el.kod))}</small>`, true);
            throw new Error(`Code (${el.kod}) in not exist`);
        }
        let minutes;
        if (el.minutes < 1) {
            minutes = `${el.minutes * 60} сек.`;
        } else if (el.minutes > 60) {
            minutes = `~ ${Math.round(el.minutes / 60)} ч.`;
        } else {
            minutes = `${el.minutes} мин.`;
        }
        acc[key].push({ ...el, minutes });
        return acc;
    }, dataVirtual);
    return dataPrepared;
}

function drawRowsInColumns(data, createColumn) {
    const tableWrapper = doc.querySelector(tbl);
    const tableColumnTemplate = doc.querySelector(tblColTemplate).content;
    const tableRowTemplate = doc.querySelector(tblRowTemplate).content;
    const tableColumnsWrapper = {};
    if (!fnGosNum) tableRowTemplate.querySelector("#gosnum")?.remove();
    if (createColumn) tableWrapper.innerHTML = ""; // pre-clear
    for (const col of Object.keys(tableColumns)) {
        if (createColumn) {
            const tableColumnClone = tableColumnTemplate.cloneNode(true);
            tableColumnClone.querySelector(`${tblCol}-header`).id = `${tblCol.slice(1)}-${col}-header`
            tableColumnClone.querySelector(`${tblCol}-content`).id = `${tblCol.slice(1)}-${col}`
            tableWrapper.appendChild(tableColumnClone);
        }
        doc.querySelector(`${tbl} > ${tblCol} > ${tableColumns[col].prefix}-header`).innerHTML = tableColumns[col].header;
        tableColumnsWrapper[col] = doc.querySelector(`${tbl} > ${tblCol} > ${tableColumns[col].prefix}`);
        tableColumnsWrapper[col].innerHTML = ""; // pre-clear
        if (data[col].length === 0) {
            tableColumnsWrapper[col].innerHTML = "<h1>Транспорт отсутствует</h1>";
        } else {
            for (const i of data[col]) {
                tableColumnsWrapper[col].appendChild(tableRowTemplate.cloneNode(true));
            }
        }
    }
}

function updateTable(data, offUpdateAnim) {
    const tableVirtual = structuredClone(tableColumns);
    for (const col of Object.keys(tableColumns)) {
        tableVirtual[col].prefix = undefined;
        for (const row of Object.keys(tableRows)) {
            tableVirtual[col][row] = doc.querySelectorAll(`${tbl} > ${tblCol} > ${tableColumns[col].prefix} > ${tblRow} ${tableRows[row].prefix}`);
        }
        if (tableVirtual[col].marsh.length !== data[col].length) {
            drawRowsInColumns(data);
            return updateTable(data, offUpdateAnim);
        }
        for (const row of Object.keys(tableRows)) {
            if (!fnGosNum && row === "gosnum") {
                tableVirtual[col].gosnum = undefined;
                continue;
            }
            // append data in table
            for (const [i, el] of data[col].entries()) {
                tableVirtual[col][row][i].innerHTML = row === "gosnum"
                    ? formatGosnum(el)
                    : escapeHtml(String(el[row] ?? ""));
                if (offUpdateAnim && temp) showUpdatesAnim(i, col, data, temp, tableVirtual);
            }
        }
    }
}

function formatGosnum(el) {
    const gosnum = String(el.gosnum ?? "").trim();
    const mainNumber = gosnum.replace(/\s+43$/, "");

    return `<span class="bus-registration-main">${escapeHtml(mainNumber)}</span><span class="bus-registration-region">43</span>`;
}

function clockTick() {
    intervalClock = setInterval(() => {
        currentDate = new Date().toLocaleString("ru-RU", dateOptions);
        showMsg(`Текущее время ${currentDate}. ${pastDate ?? ""}`);
    }, 1000);
}

function checkFreshData(data) {
    if (JSON.stringify(temp) !== JSON.stringify(data)) pastDate = `Данные от ${currentDate}.`;
    temp = data;
    showMsg(`Текущее время ${currentDate}. ${pastDate ?? ""} (+)`);
}

const showMsg = (msg, err, postMsg) => {
    const msgLine = doc.querySelector("#msg .msg");
    if (err) {
        clearInterval(intervalProcess);
        clearInterval(intervalClock);
        skeletonFlowAnim(true);
        if (postMsg === null || postMsg === undefined) postMsg = "Сообщите в ИВЦ о данной ошибке.";
        err = escapeHtml(err.toString().trim());
        msgLine.innerHTML = `${currentDate} > ${msg}<br><br><small>${err}</small><br><br><span>${postMsg}</span>`;
        // Keep only the latest error so repeated outages cannot fill localStorage.
        try {
            localStorage.setItem("cds-last-error", `${currentDate} > ${msg} ${err}`);
        } catch (storageError) {
            console.error("Unable to save CDS error log", storageError);
        }
        reloadPage(processTickWhenError);
    } else {
        msgLine.innerHTML = `<center>${msg}</center>`;
    }
    doc.querySelector("#msg").classList.toggle("msg-page-bottom", Boolean(err));
    msgLine.classList.toggle("red", Boolean(err));
    msgLine.classList.remove("hide");
};

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showUpdatesAnim(iter, col, data, table, tableVirtual) {
    for (const rowEl of Object.entries(tableRows)) {
        const row = rowEl[0];
        const rowUpdateAnim = rowEl[1].updateAnim;
        const tableVirtualValue = tableVirtual[col][row][iter];
        if (rowUpdateAnim && tableVirtualValue && (!table[col][iter] || table[col][iter][row] !== data[col][iter][row])) {
            tableVirtualValue.classList.add("updated");
            setTimeout(() => tableVirtualValue.classList.remove("updated"), 3000);
        }
    }
}

function skeletonFlowAnim(status) {
    for (const el of doc.querySelectorAll(`${tbl} > ${tblCol} ${tblRow}`)) {
        el.classList.toggle("flow", Boolean(status));
    }
}

function drawSkeletonTable() {
    const tempJson = [
        { marsh: "tmp", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "0т", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "0т", minutes: "00", gosnum: "А 000 АА 43", kod: "262" }
    ];
    const tempdata = prepareData(tempJson);
    drawRowsInColumns(tempdata, true);
    updateTable(tempdata, false);
    setTimeout(update, 1500, url);
    skeletonFlowAnim(true);
}

async function update() {
    if (updateInFlight) return;
    updateInFlight = true;
    try {
        const data = prepareData(await getData(url));
        drawRowsInColumns(data);
        updateTable(data, true);
        skeletonFlowAnim(false);
        checkFreshData(data);
    } finally {
        updateInFlight = false;
    }
}

function reloadPage(time) {
    console.log(`Reloading after ${time / 1000} sec. (${currentDate ?? "Init"})`);
    setTimeout(() => {
        console.log("Reloading now");
        location.reload(true);
    }, time);
}

function start() {
    drawSkeletonTable(); // draw skeleton table
    intervalProcess = setInterval(update, processTick); // update data every 30 seconds
    reloadPage(1800000); // reload page after 30 minutes
    clockTick(); // show current time
}

document.addEventListener("DOMContentLoaded", start);
