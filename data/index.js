const { SearchService } = require('azure-search-client');
const csv = require('csv-parse');
const { request } = require('https');
const map = require('through2-map');

const { CSV_HEADERS, CSV_DATA_URL, SEARCH_INDEX_NAME } = require('./const');

const [ searchService, searchKey ] = process.argv.slice(2);
console.log(searchService, searchKey);
const req = request(CSV_DATA_URL)
  .on('error', onError);
const parse = csv({ from: 2, columns: CSV_HEADERS.names })
  .on('error', onError);
const index = new SearchService(searchService, searchKey)
  .indexes
  .use(SEARCH_INDEX_NAME)
  .createIndexingStream()
  .on('error', onError);

if (!searchService || !searchKey) {
  throw new Error('Please specify search service name and key as command line arguments');
}

req.on('response', (resp) => {
  resp
    .on('error', onError)
    .pipe(parse)
    .pipe(map.obj(normalizeDocument))
    .pipe(index)
    .on('data', (res) => console.log(`Indexed ${res.length} items`));
}).end();

function onError(err) {
  console.error(err);
}

function normalizeDocument(doc) {
  Object.keys(doc).forEach((k) => {
    if (CSV_HEADERS.ignore[k]) {
      delete doc[k];
    } else if (CSV_HEADERS.multi[k]) {
      doc[k] = !!doc[k] ? doc[k].split('|').filter((x) => !!x) : [];
    } else if (CSV_HEADERS.json[k]) {
      doc[k] = doc[k].replace(/[\[\]]/g, '').split(',').filter((x) => !!x).map((x) => x.replace(/'/g, ''));
    } else if (CSV_HEADERS.bool[k]) {
      doc[k] = doc[k].toLowerCase() === 'true';
    }
  });
  doc.hasTags = !!doc.tags.length;
  doc.objectBeginDate = +doc.objectBeginDate;
  doc.objectEndDate = +doc.objectEndDate;
  return doc;
}