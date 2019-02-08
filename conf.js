const { writeFileSync } = require('fs');

const [
  searchService,
  searchKey,
  searchIndex,
  speechRegion,
  speechKey,
  textRegion,
  textKey,
  telemetryKey,
  outFile,
] = process.argv.slice(2);

const conf = {
  search: { account: searchService, key: searchKey, index: searchIndex },
  speech: { region: speechRegion, key: speechKey },
  text: { region: textRegion, key: textKey },
  telemetry: telemetryKey,
}

writeFileSync(outFile, JSON.stringify(conf, null, 2));
