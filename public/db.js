let db;
let budgetVersion;

// new db request for "budget" database
const request = indexedDB.open("BudgetDB", budgetVersion || 21);

request.onupgradeneeded = function (e) {
    console.log("Upgrade needed in IndexedDB");

    const { oldVersion } = e;
    const newVersion = e.newVersion || db.version;

    console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

    db = e.target.result;

    if (db.objectStoreNames.length === 0) {
        db.createObjectStore("BudgetStore", { autoIncrement: true });
    }
};

request.onerror = function (e) {
    console.log(`Whoops! ${e.target.errorCode}`);
};

function checkDatabase() {
    console.log("check db invoked");

    // open a transaction
    let transaction = db.transaction(["BudgetStore"], "readwrite");

    // access BudgetStore object
    const store = transaction.objectStore("BudgetStore");

    // get all records from store and set to a variable
    const getAll = store.getAll();

    // if request is successful
    getAll.onsuccess = function () {
        // bulk add itmes from store once we are back online
        if (getAll.result.length > 0) {
            fetch("/api/transaction/bulk", {
                method: "POST",
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json",
                },
            })
            .then((response) => response.json())
            .then((res) => {
                // if response is not empty
                if (res.length !== 0) {
                    // open another transaction with the ability to read & write
                    transaction = db.transaction(['BudgetStore'], 'readwrite');

                    // assign current store to a variable
                    const currentStore = transaction.objectStore('BudgetStore');

                    // clear existing entries
                    currentStore.clear();
                    console.log("Clearing store 🧹");
                }
            });
        }
    };
}

request.onsuccess = function (e) {
    console.log("success");
    db = e.target.result;

    // chec if app is online before reading from db
    if (navigator.online) {
        console.log("Backend online! 🗄️");
        checkDatabase();
    }
};

const saveRecord = (record) => {
    console.log("Save record invoked");

    // create a transaction with readwrite access
    const transaction = db.transaction(["BudgetStore"], "readwrite");

    // access BudgetStore object store
    const store = transaction.objectStore("BudgetStore");

    // add record using add method
    store.add(record);
};

// listen for app coming back online
window.addEventListener("online", checkDatabase);