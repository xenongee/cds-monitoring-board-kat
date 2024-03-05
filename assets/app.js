const temp_json = [
    {
        "marsh": "54а",
        "minutes": "10",
        "kod": "261"
    },
    {
        "marsh": "33а",
        "minutes": "10",
        "kod": "261"
    },
    {
        "marsh": "10а",
        "minutes": "5",
        "kod": "261"
    },
    {
        "marsh": "53а",
        "minutes": "0.7",
        "kod": "261"
    },
    {
        "marsh": "70а",
        "minutes": "2",
        "kod": "261"
    },
    {
        "marsh": "90а",
        "minutes": "2",
        "kod": "261"
    },
    {
        "marsh": "61а",
        "minutes": "0.8",
        "kod": "261"
    },
    {
        "marsh": "3т",
        "minutes": "5",
        "kod": "261"
    },
    {
        "marsh": "54а",
        "minutes": "2",
        "kod": "262"
    },
    {
        "marsh": "33а",
        "minutes": "0.4",
        "kod": "262"
    },
    {
        "marsh": "39а",
        "minutes": "14",
        "kod": "262"
    },
    {
        "marsh": "53а",
        "minutes": "12",
        "kod": "262"
    },
    {
        "marsh": "70а",
        "minutes": "25",
        "kod": "262"
    },
    {
        "marsh": "90а",
        "minutes": "0.9",
        "kod": "262"
    },
    {
        "marsh": "61а",
        "minutes": "7",
        "kod": "262"
    },
    {
        "marsh": "3т",
        "minutes": "1",
        "kod": "262"
    }
];
const url = "https://some.url/aviatech/index.php";

async function cdsFetch() {
    const response = await fetch(url);

    if (response.ok) {
        const json = await response.json();
        console.log(json);
    } else {
        alert("Ошибка HTTP: " + response.status);
    }
}

function cdsTableUpdate() {
    cdsFetch();
    cdsTableEdit();
}

function cdsTableEdit() {
    console.log("321");
}

(() => {
    // setInterval(cdsTableUpdate, 10000);
    console.log(temp_json);
})();