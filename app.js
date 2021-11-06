const fs = require("fs");
const express = require('express');
const bodyParser = require('body-parser');
const { getUnpackedSettings } = require("http2");
const app = express();
const port = 3001;

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "*");

    if (req.method === "OPTIONS") {
        res.status(200);
        res.send();
        return;
    }
    next();
});

app.use((req, res, next) => {
    const url = req.url.split("?")[0];
    const body = req.body;

    let jsonData;

    if (url.includes("socket.io")) {
        return;
    }

    try {
        console.log("data" + url + ".json");
        jsonData = fs.readFileSync("data" + url + ".json", 'utf8');
        jsonData = JSON.parse("{\"data\":" + jsonData + "}");
        res = handleData(req, res, jsonData);
    } catch (e) {
        console.log("data" + url + "/default.json");

        try {
            jsonData = fs.readFileSync("data" + url + "/default.json", 'utf8');
            jsonData = JSON.parse("{\"data\":" + jsonData + "}");
            res = handleData(req, res, jsonData);
        } catch (e) {
            console.log("[XXXXXXXXX] Could not find match for body:");
            console.log(body);
            res.status(500);
            res.send(e);
        }
    }
});

app.listen(port, () => {
    console.log(`Application listening at http://localhost:${port}`);
});

function handleData(req, res, jsonData) {
    const obj = jsonData.data.find((element) => element.method === req.method);

    if (JSON.stringify(req.body) === JSON.stringify({})) {
        req.body = undefined;
    }

    if (JSON.stringify(req.headers) === JSON.stringify({})) {
        req.headers = undefined;
    }

    let mock = obj.mocks.find(
        (element) => {
            const bodyMatching = JSON.stringify(element.body) === JSON.stringify(req.body);

            const reqHeaders = req.headers !== undefined ? req.headers : {};
            const elemHeaders = element.headers !== undefined ? element.headers : {};

            var headersMatching = true;
            for (const [key, value] of Object.entries(elemHeaders)) {
                if (reqHeaders[key] !== value) {
                    headersMatching = false;
                    break;
                }
            }

            return bodyMatching && headersMatching;
        }
    );

    res.status(mock.status);
    res.json(mock.data);

    return res;
}
