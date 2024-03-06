/**
 * CDS Vyatka monotoring screen for KAT 
 * Public transportation monitoring screen from CDS on two route directions for Kirov Aviation Technical School
 *
 * Author: @xenongee
 * Created: 01.03.2024
 * Last update: 06.03.2024
 */

const doc = document;
const url = "https://some.url/aviatech/index.php";
const fnGosNum = true;
const fnSortByTime = false;
const tableID = "#cds-table";
const tableColumn = {
    train: { prefix: "#column-train", kod: "261", header: "В сторону Ж/Д" },
    folk: { prefix: "#column-folk", kod: "262", header: "В сторону ОДНТ" },
};
const tableRow = {
    marsh: { prefix: "#content-bus #bus", updateAnim: false },
    gosnum: { prefix: "#content-bus #gosnum", updateAnim: false },
    minutes: { prefix: "#content-time", updateAnim: true },
};
const dateOptions = { dateStyle: "short", timeStyle: "medium" };
const processTick = 25000;
const processTickWhenError = 300000;
let intervalProcess, intervalClock, currentDate, pastDate, temp;

async function getData(url) {
    const response = await fetch(url).catch((err) => {
        showMsg(`Не удалось получить данные: ${err}`, true);
        throw new Error(err);
    });
    if (!response.ok) {
        showMsg(`Ошибка HTTP: ${response.status} - ${response.statusText}`, true);
        throw new Error(response.status);
    }
    const data = response.json().catch((err) => {
        showMsg(`Данные не в виде JSON (возможно, отсувствует транспорт на пути следования): ${err}`, true);
        throw new Error(err);
    });
    return data;
}

function prepareData(data) {
    const dataVirtual = structuredClone(tableColumn);
    for (const col of Object.keys(tableColumn)) {
        dataVirtual[col].prefix = undefined;
        dataVirtual[col].kod = undefined;
        dataVirtual[col] = [];
    }
    data.sort(fnSortByTime ? (a, b) => a.minutes - b.minutes : (a, b) => a.marsh - b.marsh);
    const dataPrepared = data.reduce((acc, el) => {
        const key = Object.keys(tableColumn).find((col) => el.kod === tableColumn[col].kod);
        if (!(key in tableColumn)) {
            showMsg(`Код маршрута не существует: ${el.kod}`, true);
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

function drawRowsInColumns(data) {
    const tableRowTemplate = doc.querySelector(`${tableID} > #cds-table-row-template`).content;
    const tableColumnsVirtual = {};
    for (const col of Object.keys(tableColumn)) {
        doc.querySelector(`${tableID} > #column > .table-header${tableColumn[col].prefix}`).innerHTML = tableColumn[col].header;
        tableColumnsVirtual[col] = doc.querySelector(`${tableID} > #column > .table-column${tableColumn[col].prefix}`);
        tableColumnsVirtual[col].innerHTML = ""; // pre-clear
    }
    if (!fnGosNum) tableRowTemplate.querySelector("small#gosnum").remove();
    for (const col of Object.keys(tableColumn)) {
        if (data[col].length === 0) {
            tableColumnsVirtual[col].innerHTML = "<h1>Транспорт отсутствует</h1>";
        } else {
            for (const i of data[col]) {
                tableColumnsVirtual[col].appendChild(tableRowTemplate.cloneNode(true));
            }
        }
    }
}

function updateTable(data, offUpdateAnim) {
    const tableVirtual = structuredClone(tableColumn);
    for (const col of Object.keys(tableColumn)) {
        tableVirtual[col].prefix = undefined;
        for (const row of Object.keys(tableRow)) {
            tableVirtual[col][row] = doc.querySelectorAll(`${tableID} > #column > .table-column${tableColumn[col].prefix} > #row ${tableRow[row].prefix}`);
        }
    }
    for (const col of Object.keys(tableColumn)) {
        for (const row of Object.keys(tableRow)) {
            // check data sizes with table size
            if (tableVirtual[col][row].length !== data[col].length) drawRowsInColumns(data);
            // append data in table
            data[col].forEach((el, i) => {
                tableVirtual[col][row][i].innerHTML = el[row];
                if (offUpdateAnim && temp) showUpdatesAnim(i, col, data, temp, tableVirtual);
            });
        }
    }
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

function skeletonFlowAnim(status) {
    for (const el of doc.querySelectorAll(`${tableID} > #column #row`)) {
        el.classList.toggle("flow", Boolean(status));
    }
}

function showUpdatesAnim(iter, col, data, table, tableVirtual) {
    for (const rowEl of Object.entries(tableRow)) {
        const row = rowEl[0];
        const rowUpdateAnim = rowEl[1].updateAnim;
        const tableVirtualValue = tableVirtual[col][row][iter];
        if (rowUpdateAnim && (!table[col][iter] || table[col][iter][row] !== data[col][iter][row]))
            setTimeout(() => tableVirtualValue.classList.remove("updated"), 3000, tableVirtualValue.classList.add("updated"));
    }
}

const showMsg = (msg, err) => {
    const msgLine = doc.querySelector("#msg .msg");
    if (err) {
        clearInterval(intervalProcess);
        clearInterval(intervalClock);
        skeletonFlowAnim(true);
        setTimeout(() => {
            start();
        }, processTickWhenError);
        msgLine.innerHTML = `${currentDate} ><br> ${msg} ${(err ? "<br><br><b>Сообщите в ИВЦ о данной ошибке.</b>" : "")}`;
    } else {
        msgLine.innerHTML = `<center>${msg}</center>`;
    }
    doc.querySelector("#msg").classList.toggle("msg-page-bottom", Boolean(err));
    msgLine.classList.toggle("red", Boolean(err));
    msgLine.classList.remove("hide");
};

async function update() {
    const data = prepareData(await getData(url));
    drawRowsInColumns(data);
    updateTable(data, true);
    skeletonFlowAnim(false);
    checkFreshData(data);
}

function start() {
    const tempJson = [
        { marsh: "temp", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "33а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "10а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "53а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "70а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "90а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "61а", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "3т", minutes: "00", gosnum: "А 000 АА 43", kod: "261" },
        { marsh: "54а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "33а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "39а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "53а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "70а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "90а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "61а", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
        { marsh: "3т", minutes: "00", gosnum: "А 000 АА 43", kod: "262" }
    ];
    const tempdata = prepareData(tempJson);
    drawRowsInColumns(tempdata);
    updateTable(tempdata, false);
    setTimeout(() => {
        update(url);
    }, 1500);
    intervalProcess = setInterval(() => {
        update(url);
    }, processTick);
    clockTick();
}
(() => {
    start();
})();
