var money = "1,00",
    kg = 0;
const DB_NAME = "offline_db";
const DB_VERSION = 1;
const DB_STORE_NAME = "kantar";

var db;
var current_view_pub_key;

function openDb() {
    var request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("indexedDB success");
        displayProducts(getObjectStore(DB_STORE_NAME, "readonly"));
    };

    request.onerror = function (event) {
        alert("indexedDB error");
    };

    request.onupgradeneeded = function (event) {
        console.log("openDb.onupgradeneeded");
        var store = event.currentTarget.result.createObjectStore(
            DB_STORE_NAME,
            {
                keyPath: "id",
                autoIncrement: true,
            }
        );

        store.createIndex("product_id", "product_id", { unique: true });
        store.createIndex("license_plate", "license_plate", { unique: false });
        store.createIndex("product_price", "product_price", { unique: false });
        store.createIndex("product_category", "product_category", {
            unique: false,
        });
    };
}

function getObjectStore(store_name, mode) {
    var tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
}

function displayProducts(store) {
    $("#list").empty();

    if (typeof store == "undefined")
        store = getObjectStore(DB_STORE_NAME, "readonly");

    var req;
    req = store.count();
    req.onsuccess = function (event) {
        var count = event.target.result;
        if (count == 0) {
            $("#list").append("<i class='status-msg'>No products found</i>");
            document.getElementById("btn_sync").style.display = "none";
            document.getElementById("btn_clear").style.display = "none";
        } else {
            document.getElementById("btn_sync").style.display = "flex";
            document.getElementById("btn_clear").style.display = "flex";
        }
    };
    req.onerror = function (event) {
        console.error("add error", this.error);
    };

    req = store.openCursor();
    req.onsuccess = function (evt) {
        var cursor = evt.target.result;
        if (cursor) {
            // console.log("displayProducts cursor:", cursor);
            req = store.get(cursor.key);
            var value = cursor.value;

            var list_item = $(
                "<li>" +
                    cursor.key +
                    " - " +
                    "<b>Product Name: </b>" +
                    value.license_plate +
                    "&nbsp;&nbsp; <b>Price: </b> " +
                    value.product_price +
                    "&nbsp;&nbsp; <b>Category: </b> " +
                    value.product_category +
                    "</li>"
            );
            $("#list").append(list_item);
            cursor.continue();
        }
    };
}

function addProduct(
    product_id,
    license_plate,
    product_price,
    product_category
) {
    // console.log("addPublication arguments:", arguments);
    var product = {
        product_id: product_id,
        license_plate: license_plate,
        product_price: product_price,
        product_category: product_category,
    };

    var store = getObjectStore(DB_STORE_NAME, "readwrite");
    var req;
    try {
        req = store.add(product);
    } catch (e) {
        throw e;
    }
    req.onsuccess = function (evt) {
        console.log("Product added");
        displayProducts(store);
    };
    req.onerror = function () {
        console.error("addPublication error", this.error);
        displayActionFailure(this.error);
    };
}

function setConnection() {
    var connection = window.navigator.onLine ? "Online" : "Offline";
    document.getElementById("status").innerHTML = connection;

    window.addEventListener("online", () => {
        document.getElementById("status").innerHTML = "Online";
    });
    window.addEventListener("offline", () => {
        document.getElementById("status").innerHTML = "Offline";
    });
}

function checkConnection() {
    if (window.navigator.onLine) {
        return true;
    } else {
        return false;
    }
}

function handleLiveChange(event) {
    var val = event.target.value;
    val = val.replace(/[^\d(\d{1,2})+\.]/g, "");
    document.getElementById("prod_price").value = val;
    var res = maskMoney(val);
    document.getElementById("prod_price").value = res;
}

function maskMoney(val) {
    if (val) {
        val = val.toString();
        var split1 = val.split(".");
        money = "";
        split1.forEach(function (element) {
            money += element;
        });
        var slice = money.split(",");
        if (slice) {
            var price = slice[0];
            var len = price.length;
            if (len >= 4) {
                var dot = 3;
                for (var i = 3; i < len; i += 3) {
                    price = price.slice(0, -dot) + "." + price.slice(-dot);
                    dot += 4;
                }
            }
            slice[1] != undefined ? (price += "," + slice[1]) : "";
        }
        return price;
    } else return "";
}

function getEntry() {
    $("#list-database").empty();
    $.ajax({
        url: "https://db-api-app.herokuapp.com/api/get/entry/",
        type: "GET",
        success: function (data) {
            var list_item = "";
            data.forEach((element) => {
                $(
                    (list_item +=
                        "<li>" +
                        element.id +
                        " - " +
                        "<b>Licance plate: </b>" +
                        element.plaka_no +
                        "&nbsp;&nbsp; <b>Price: </b> " +
                        element.fiyat +
                        "&nbsp;&nbsp; <b>Category: </b> " +
                        element.mal_cinsi +
                        "</li>")
                );
            });
            $("#list-database").append(list_item);
        },
        error: function (error) {
            $("#list-database").append("<i class='status-msg'>No data</i>");
        },
    });
}

document.addEventListener("DOMContentLoaded", function () {
    setConnection();
    openDb();
    getEntry();
});

document.getElementById("btn_add").addEventListener("click", function () {
    const connection = checkConnection();
    const obj = {
        license_plate: document.getElementById("license_plate").value
            ? document.getElementById("license_plate").value
            : "21 ABK 21",
        prod_price: document.getElementById("prod_price").value
            ? document.getElementById("prod_price").value
            : "1,00",
        prod_cat: document.getElementById("prod_cat").value,
    };
    kg = (Math.random() * (70 - 1) + 30).toFixed(3);
    if (connection) {
        var url = "https://db-api-app.herokuapp.com/api/post/entry/";
        var data = {
            plaka_no: obj.license_plate,
            giris_tarihi: new Date().toLocaleDateString(),
            giris_saati: new Date().toLocaleTimeString(),
            mal_cinsi: obj.prod_cat,
            fiyat: parseFloat(
                obj.prod_price.split(".").join("").split(",").join(".")
            ).toFixed(3),
            kg: kg,
        };
        $.ajax({
            url: url,
            type: "POST",
            data: { obj: JSON.stringify(data) },
            success: function (response) {
                var res = JSON.parse(response);
                console.log(res.message);
                getEntry();
            },
        });
    } else {
        addProduct(
            "_" + Math.random().toString(36).substr(2, 9),
            obj.license_plate,
            obj.prod_price,
            obj.prod_cat
        );
    }

    // clear inputs
    document.getElementById("license_plate").value = "";
    document.getElementById("prod_price").value = "1,00";
});

document.getElementById("btn_clear").addEventListener("click", function () {
    // clear indexdb
    var store = getObjectStore(DB_STORE_NAME, "readwrite");
    var req = store.clear();
    req.onsuccess = function () {
        console.log("IndexedDB cleared");
        displayProducts(store);
    };
});

document.getElementById("btn_sync").addEventListener("click", function () {
    const connection = checkConnection();
    if (connection) {
        var store = getObjectStore(DB_STORE_NAME, "readonly");
        var req = store.getAll();
        req.onsuccess = function () {
            var products = req.result;
            if (products.length > 0) {
                var url = "https://db-api-app.herokuapp.com/api/post/entry/";
                products.forEach((element) => {
                    var data = {
                        plaka_no: element.license_plate,
                        giris_tarihi: new Date().toLocaleDateString(),
                        giris_saati: new Date().toLocaleTimeString(),
                        mal_cinsi: element.product_category,
                        fiyat: parseFloat(
                            element.product_price
                                .split(".")
                                .join("")
                                .split(",")
                                .join(".")
                        ),
                        kg:
                            kg === 0
                                ? (Math.random() * (70 - 1) + 30).toFixed(3)
                                : kg,
                    };
                    $.ajax({
                        url: url,
                        type: "POST",
                        data: { obj: JSON.stringify(data) },
                        success: function (response) {
                            var res = JSON.parse(response);
                            console.log(res.message);
                            getEntry();
                        },
                    });
                });
            }
            document.getElementById("btn_clear").click();
        };
    } else {
        alert("Data is not synced, please connect to internet");
    }
});
