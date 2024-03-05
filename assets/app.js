/**
 * CDS Vyatka Monotoring Hardcoded Script
 *
 * Author: xenongee
 * Created: 01.03.2024
 */

const doc = document;
const url = "https://some.url/aviatech/index.php";
const fnGosNum = true;
const fnSortByTime = false;
const tableID = "#cds-table";
const tableColumn = {
	train: { prefix: "#column-train" },
	folk: { prefix: "#column-folk" },
};
const tableRow = {
	marsh: { prefix: "#content-bus #bus", updateAnim: false },
	gosnum: { prefix: "#content-bus #gosnum", updateAnim: false },
	minutes: { prefix: "#content-time", updateAnim: true },
};
const dateOptions = { dateStyle: "short", timeStyle: "medium" };
let intervalProcess,
	intervalClock,
	currentDate,
	pastDate,
	temp,
	tablePrevLength;

async function getData(url) {
	const response = await fetch(url).catch((err) => {
		showMsg("Не удалось получить данные: " + err, true);
		throw err;
	});
	if (!response.ok) {
		showMsg(
			"Ошибка HTTP: " + response.status + " - " + response.statusText,
			true,
		);
		throw new Error(response.status);
	}

	return response.json();
}

function prepareData(data) {
	data.sort(
		fnSortByTime
			? (a, b) => a.minutes - b.minutes
			: (a, b) => a.marsh - b.marsh,
	);

	const obj = data.reduce(
		(acc, el) => {
			let key;
			if (el.kod === "261") {
				key = "train";
			} else if (el.kod === "262") {
				key = "folk";
			}
			const minutes =
				el.minutes < 1 ? el.minutes * 60 + " сек." : el.minutes + " мин.";
			acc[key].push({ ...el, minutes });
			return acc;
		},
		{ train: [], folk: [] },
	);

	return obj;
}

function addRowsInColumns(data) {
	const tableRowTemplate = doc.querySelector(
		tableID + "> #cds-table-row-template",
	).content;
	const tableRawColumns = {};

	Object.keys(tableColumn).forEach(
		(col) =>
			(tableRawColumns[col] = doc.querySelector(
				tableID + "> #column >" + tableColumn[col].prefix,
			)),
	);

	if (!fnGosNum) tableRowTemplate.querySelector("small#gosnum").remove();

	Object.keys(tableColumn).forEach((col) => {
		for (let j = 0; j < data[col].length; j++) {
			tableRawColumns[col].appendChild(tableRowTemplate.cloneNode(true));
		}
	});
}

function updateTable(data, offUpdateAnim) {
	const tableVirtual = structuredClone(tableColumn);
	Object.keys(tableColumn).forEach((col) => {
		delete tableVirtual[col].prefix;
		Object.keys(tableRow).forEach(
			(row) =>
				(tableVirtual[col][row] = doc.querySelectorAll(
					`${tableID} > #column > ${tableColumn[col].prefix} > #row ${tableRow[row].prefix}`,
				)),
		);
	});

	Object.keys(tableColumn).forEach((col) => {
		Object.keys(tableRow).forEach((row) => {
			// clear
			if (data[col].length > tablePrevLength) {
				tableMaxLength = data[col].length;
			} else {
				tableMaxLength = tablePrevLength;
			}
			[...Array(tableMaxLength).keys()].forEach((i) => {
				tableVirtual[col][row][i].innerHTML = " ";
			});

			// if (data) console.log(row,  );
			// append
			data[col].forEach((el, i) => {
				if (offUpdateAnim) showUpdatesAnim(i, col, data, tableVirtual);
				tableVirtual[col][row][i].innerHTML = el[row];
				// console.log(el[row]);
			});
		});
		tablePrevLength = data[col].length;
	});
}

function tickclock() {
	currentDate = new Date().toLocaleString("ru-RU", dateOptions);
	showMsg("Текущее время " + currentDate + (pastDate ?? "") + ".");
}

function checkFreshData(data) {
	if (JSON.stringify(temp) != JSON.stringify(data))
		pastDate = ". Данные от " + currentDate;
	temp = data;
	showMsg("Текущее время " + currentDate + (pastDate ?? "") + ".");
}

function skeletonFlowAnim(status) {
	doc.querySelectorAll(tableID + " > #column #row")
		.forEach((el) => el.classList.toggle("flow", Boolean(status)));
}

function showUpdatesAnim(iter, col, data, table) {
	Object.entries(tableRow).forEach((r) => {
		row = r[0];
		rowUpdateAnim = r[1].updateAnim;
		if (
			rowUpdateAnim &&
			table[col][row][iter].innerHTML != data[col][iter][row]
		) {
			table[col][row][iter].classList.add("updated");
			setTimeout(() => table[col][row][iter].classList.remove("updated"), 6000);
		}
	});
}

const showMsg = (msg, err) => {
	const msgLine = doc.querySelector("#msg .msg");
	if (err) {
		clearInterval(intervalProcess);
		clearInterval(intervalClock);
		skeletonFlowAnim(true);
		setTimeout(() => {
			start();
		}, 10000);
	}
	doc.querySelector("#msg").classList.toggle("msg-page-bottom", Boolean(err));
	msgLine.classList.toggle("red", Boolean(err));
	msgLine.classList.remove("hide");
	msgLine.innerHTML = msg + (err ? "<br><br><b>Ошибка не пропала? Сообщите в ИВЦ.</b>" : "");
};

async function update() {
	const data = prepareData(await getData(url));
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
		{ marsh: "3т", minutes: "00", gosnum: "А 000 АА 43", kod: "262" },
	];
	const tempdata = prepareData(tempJson);
	addRowsInColumns(tempdata); // Important: Run once
	updateTable(tempdata, false);

	setTimeout(() => {
		update(url);
	}, 1500);
	intervalProcess = setInterval(() => {
		update(url);
	}, 20000);
	intervalClock = setInterval(() => {
		tickclock();
	}, 1000);
}

(() => {
	start();
})();
