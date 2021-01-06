const puppeteer = require('puppeteer');
var cheerio = require('cheerio');
var http = require('http');
var assert = require('assert');

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://fed:ciaociao@cluster0.6bgdz.azure.mongodb.net/test?retryWrites=true&w=majority";

const insertDocument = function (db, value, callback) {
    // Get the documents collection
    const collection = db.collection('data');

    // Insert document
    collection.insertOne(
        { date: new Date(), vaccinated: value }, function (err, result) {
            assert.equal(err, null);
            assert.equal(1, result.result.n);
            assert.equal(1, result.ops.length);
            console.log("Inserted document into the collection");
            callback(result);
        });
}

const findDocument = async function (db, value, callback) {
    // Get the documents collection
    const collection = db.collection('data');
    // Find the document if it exists
    const doc = await collection.findOne({ 'vaccinated': value });
    callback(doc);
}

setInterval(() => {
    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://app.powerbi.com/view?r=eyJrIjoiMzg4YmI5NDQtZDM5ZC00ZTIyLTgxN2MtOTBkMWM4MTUyYTg0IiwidCI6ImFmZDBhNzVjLTg2NzEtNGNjZS05MDYxLTJjYTBkOTJlNDIyZiIsImMiOjh9'
            , { waitUntil: 'networkidle2' });
        var $ = cheerio.load(await page.content());
        var nVaccinated = $('text.value tspan').text();
        console.log(nVaccinated);

        http.createServer(function (req, res) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(nVaccinated);
        }).listen();

        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

        client.connect(err => {
            var db = client.db("test");

            if (err) {
                throw err;
            }
            findDocument(db, nVaccinated, (doc) => {
                console.log("Found ", doc);
                if (!doc) {
                    insertDocument(db, nVaccinated, function () {
                        console.log("Closing connection");
                        client.close();
                    });
                }
                else if (doc) {
                    console.log("Closing connection");
                    client.close();
                }
            });
            // perform actions on the collection object
        });

        await browser.close();
    })();
}, 3600000);