/**
 * CDS Vyatka Monotoring Script
 *
 * Author: xenongee
 * Created: 01.03.2024
 */

const doc = document;
const url = "https://some.url/aviatech/index.php";
const fakeJson = [
  {
    marsh: "fake",
    minutes: "1",
    kod: "261",
  },
  {
    marsh: "33а",
    minutes: "24",
    kod: "261",
  },
  {
    marsh: "10а",
    minutes: "41",
    kod: "261",
  },
  {
    marsh: "53а",
    minutes: "1",
    kod: "261",
  },
  {
    marsh: "70а",
    minutes: "3",
    kod: "261",
  },
  {
    marsh: "90а",
    minutes: "7",
    kod: "261",
  },
  {
    marsh: "61а",
    minutes: "37",
    kod: "261",
  },
  {
    marsh: "3т",
    minutes: "7",
    kod: "261",
  },
  {
    marsh: "54а",
    minutes: "2",
    kod: "262",
  },
  {
    marsh: "33а",
    minutes: "7",
    kod: "262",
  },
  {
    marsh: "39а",
    minutes: "6",
    kod: "262",
  },
  {
    marsh: "53а",
    minutes: "10",
    kod: "262",
  },
  {
    marsh: "70а",
    minutes: "4",
    kod: "262",
  },
  {
    marsh: "90а",
    minutes: "6",
    kod: "262",
  },
  {
    marsh: "61а",
    minutes: "46",
    kod: "262",
  },
  {
    marsh: "3т",
    minutes: "2",
    kod: "262",
  },
];

async function getData(url) {
  const response = await fetch(url);
  if (!response.ok) console.log("Ошибка HTTP: " + response.status);
  const json = await response.json();
  console.log("Data received");

  return json;
}

function prepareData(data) {
  const objTrain = []; // zhd
  const objFolk = []; // odnt

  data.sort((a, b) => a.marsh - b.marsh);
  // data.sort((a, b) => a.minutes - b.minutes);

  for (let i = 0; i < data.length; i++) {
    // fix floating minutes to seconds and add time prefix
    if (data[i].minutes < 1) {
      data[i].minutes = data[i].minutes * 60 + " сек.";
    } else {
      data[i].minutes = data[i].minutes + " мин.";
    }

    // division of arrays of bus routes by directions (train ~ zsh stancia, folk ~ odnt)
    if (data[i].kod === "261") {
      objTrain.push(data[i]);
    } else if (data[i].kod === "262") {
      objFolk.push(data[i]);
    }
  }

  return { train: objTrain, folk: objFolk };
}

function addRowsToTable(data) {
  const tableRowTemplate = doc.querySelector(".cds.table>#cds-table-row").content;
  const tableTrainRows = doc.querySelector(".cds.table>.train>.table-rows");
  const tableFolkRows = doc.querySelector(".cds.table>.folk>.table-rows");

  for (let i = 0; i < data.train.length; i++) {
    tableTrainRows.appendChild(tableRowTemplate.cloneNode(true));
  }
  for (let i = 0; i < data.folk.length; i++) {
    tableFolkRows.appendChild(tableRowTemplate.cloneNode(true));
  }
}

function updateTable(data, noeffects = false) {
  const dataLength = Object.getOwnPropertyNames(data).length;
  const tableTrainRow = doc.querySelectorAll(
    ".cds.table>.train>.table-rows>.grid>#content"
  );
  const tableFolkRow = doc.querySelectorAll(
    ".cds.table>.folk>.table-rows>.grid>#content"
  );

  for (let i = 0; i < data.train.length * 2; i = i + 2) {
    if (noeffects) showUpdates(i, tableTrainRow, data.train);

    tableTrainRow[i].innerHTML = data.train[i / 2].marsh;
    tableTrainRow[i + 1].innerHTML = data.train[i / 2].minutes;
  }

  for (let i = 0; i < data.folk.length * 2; i = i + 2) {
    if (noeffects) showUpdates(i, tableFolkRow, data.folk);

    tableFolkRow[i].innerHTML = data.folk[i / 2].marsh;
    tableFolkRow[i + 1].innerHTML = data.folk[i / 2].minutes;
  }

  console.log("Table updated");
}

function removeSkeleton() {
  const tableRowGrid = doc.querySelectorAll(".table .table-rows>.grid");
  for (let i = 0; i < tableRowGrid.length; i++) {
    tableRowGrid[i].classList.remove("flow");
  }
}

function showUpdates(i, row, data) {
  // just add css effect for loop in updateTable function
  if (row[i + 1].textContent !== data[i / 2].minutes) {
    // row[i].classList.add("updated");
    row[i + 1].classList.add("updated");
    setTimeout(() => {
      // row[i].classList.remove("updated");
      row[i + 1].classList.remove("updated");
    }, 3000);
  }
}

async function update() {
  const json = await getData(url);
  const data = prepareData(json);
  updateTable(data, true);
  removeSkeleton();
}

(() => {
  const fakedata = prepareData(fakeJson);
  addRowsToTable(fakedata);
  updateTable(fakedata);
  // removeSkeleton();
  // update(url);
  setInterval(() => {
    console.log("Refresh");
    update(url);
  }, 10000);
})();
