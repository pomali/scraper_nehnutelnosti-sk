// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();

function initDatabase(callback) {
	// Set up sqlite database.
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		db.run("CREATE TABLE IF NOT EXISTS data (ident TEXT, name TEXT, price REAL, area REAL, location TEXT, url TEXT, photo TEXT)");
		callback(db);
	});
}

function updateRow(db, ident, name, price, area, location, url, photo) {
	// Insert some data.
	var statement = db.prepare("INSERT INTO data VALUES (?, ?, ?, ?, ?, ?, ?)");
	statement.run(ident, name, price, area, location, url, photo);
	statement.finalize();
}

function readRows(db) {
	// Read some data.
	db.each("SELECT rowid AS id, ident, name, price, area, location, url, photo FROM data", function(err, row) {
		console.log(row.ident + ": " + row.name);
	});
}

function fetchPage(url, callback) {
	// Use request to read in pages.
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body);
	});
}

function run(db) {
	// Use request to read in pages.
	fetchPage("http://www.nehnutelnosti.sk/bratislava-iv-karlova-ves/byty/predaj?p%5Bdistance%5D=10&p%5Bparam1%5D%5Bfrom%5D=60000&p%5Bparam1%5D%5Bto%5D=150000&p%5Bparam11%5D%5Bfrom%5D=50&p%5Bparam11%5D%5Bto%5D=150&p%5Bfoto%5D=1&p%5Bcategories%5D%5Bids%5D=10003.10004.10005.10006", function (body) {
		// Use cheerio to find things in the page with css selectors.
		var $ = cheerio.load(body);

		var elements = $("#inzeraty div.inzerat").each(function (i,el) {
            var $el = $(el)
            var ident = $el.attr("id")
            var $headLink = $el.find(".advertisement-head h2>a")
            var $content = $el.find(".inzerat-content")

            var name = $headLink.text()
            var price = parseFloat(
                $el
                .find(".cena span.red")
                .first()
                .text()
                .replace(/\D/g,'')
            )
            var area = parseFloat(
                $content
                .find(".estate-area span.red")
                .first()
                .text().replace(/\D/g,'')
            )
            var location = $content.find(".locationText").text() || 'missing location'
            var url = $headLink.attr("href")
            var photo = $el.find(".advertisement-photo img").attr("data-src") || 'no-photo' 

			updateRow(db, ident, name, price, area, location, url, photo);
		});

		readRows(db);

		db.close();
	});
}

initDatabase(run);
