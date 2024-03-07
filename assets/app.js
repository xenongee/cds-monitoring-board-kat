/**
 * CDS Vyatka Monotoring screen for KAT
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
const processTick = 10000;
const processTickWhenError = 300000;
// biome-ignore lint/style/useSingleVarDeclarator: <explanation>
let  intervalProcess, intervalClock, currentDate, pastDate, temp;

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
    const dataVirtual = structuredClone(tableColumns);
    for (const col of Object.keys(tableColumns)) {
        dataVirtual[col].prefix = undefined;
        dataVirtual[col].kod = undefined;
        dataVirtual[col] = [];
    }
    data.sort(fnSortByTime ? (a, b) => a.minutes - b.minutes : (a, b) => a.marsh - b.marsh);
    const dataPrepared = data.reduce((acc, el) => {
        const key = Object.keys(tableColumns).find((col) => el.kod === tableColumns[col].kod);
        if (!(key in tableColumns)) {
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
        acc[key].push({...el, minutes});
        return acc;
    }, dataVirtual);
    return dataPrepared;
}

function drawRowsInColumns(data, createColumn) {
    const tableWrapper = doc.querySelector(tbl);
    const tableColumnTemplate = doc.querySelector(tblColTemplate).content;
    const tableRowTemplate = doc.querySelector(tblRowTemplate).content;
    const tableColumnsWrapper = {};
    if (!fnGosNum) tableRowTemplate.querySelector("small#gosnum")?.remove();
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
        for (const row of Object.keys(tableRows)) {
            if (!fnGosNum && row === "gosnum") {
                tableVirtual[col].gosnum = undefined;
                continue;
            }
            // checking data sizes with table size, if sizes are not equal, table will be cleared
            if (tableVirtual[col][row].length !== data[col].length) drawRowsInColumns(data);
            // append data in table
            for(const [i, el] of data[col].entries()) {
                tableVirtual[col][row][i].innerHTML = el[row];
                if (offUpdateAnim && temp) showUpdatesAnim(i, col, data, temp, tableVirtual);
            }
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

function showUpdatesAnim(iter, col, data, table, tableVirtual) {
    for (const rowEl of Object.entries(tableRows)) {
        const row = rowEl[0];
        const rowUpdateAnim = rowEl[1].updateAnim;
        const tableVirtualValue = tableVirtual[col][row][iter];
        if (rowUpdateAnim && (!table[col][iter] || table[col][iter][row] !== data[col][iter][row]))
            setTimeout(() => tableVirtualValue.classList.remove("updated"), 3000, tableVirtualValue.classList.add("updated"));
    }
}

function skeletonFlowAnim(status) {
    for (const el of doc.querySelectorAll(`${tbl} > ${tblCol} ${tblRow}`)) {
        el.classList.toggle("flow", Boolean(status));
    }
}

function drawSkeletonTable() {
    const tempJson = [
		{ marsh: "tmp", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "0т", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "00а", minutes: "00", gosnum: "А 000 АА 43", kod: "000" },
		{ marsh: "0т", minutes: "00", gosnum: "А 000 АА 43", kod: "000" }
	];
    const tempdata = prepareData(tempJson);
    drawRowsInColumns(tempdata, true);
    updateTable(tempdata, false);
    setTimeout(update, 1500, url);
}

async function update() {
    const data = prepareData(await getData(url));
    drawRowsInColumns(data);
    updateTable(data, true);
    skeletonFlowAnim(false);
    checkFreshData(data);
}

function start() {
    drawSkeletonTable(); // draw skeleton table
    intervalProcess = setInterval(update, processTick, url); // update data every 10s
    setTimeout(location.reload, 540000, true); // reload page after 1.5h
    clockTick(); // show current time
}

document.addEventListener("DOMContentLoaded", start);