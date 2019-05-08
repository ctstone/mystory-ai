const CSV_HEADERS = [
  'objectNumber',
  'isHighlight',
  'isPublicDomain',
  'objectId',
  'department',
  'objectName',
  'title',
  'culture',
  'period',
  'dynasty',
  'reign',
  'portfolio',
  'artistRole',
  'artistPrefix',
  'artistDisplayName',
  'artistDisplayBio',
  'artistSuffix',
  'artistAlphaSort',
  'artistNationality',
  'artistBeginDate',
  'artistEndDate',
  'objectDate',
  'objectBeginDate',
  'objectEndDate',
  'medium',
  'dimensions',
  'creditLine',
  'geographyType',
  'city',
  'state',
  'county',
  'country',
  'region',
  'subregion',
  'locale',
  'locus',
  'excavation',
  'river',
  'classification',
  'rightsAndReproduction',
  'linkResource',
  'metadataDate',
  'repository',
  'tags',
];

const CSV_HEADERS_IGNORE = {
  artistAlphaSort: true,
  linkResource: true,
  repository: true,
};

const CSV_HEADERS_MULTIVALUE = {
  artistRole: true,
  artistPrefix: true,
  artistDisplayName: true,
  artistDisplayBio: true,
  artistBeginDate: true,
  artistEndDate: true,
  geographyType: true,
  country: true,
  city: true,
  artistNationality: true,
  region: true,
  state: true,
  county: true,
  classification: true,
  artistSuffix: true,
  artistAlphaSort: true,
  title: true,
  medium: true,
  subregion: true,
  locus: true,
  locale: true,
  excavation: true,
};

const CSV_HEADERS_JSONARRAY = {
  tags: true,
  additionalImageUrls: true,
};

const CSV_HEADERS_BOOLEAN = {
  isPublicDomain: true,
  isHighlight: true,
}

exports.CSV_HEADERS = {
  names: CSV_HEADERS,
  ignore: CSV_HEADERS_IGNORE,
  multi: CSV_HEADERS_MULTIVALUE,
  json: CSV_HEADERS_JSONARRAY,
  bool: CSV_HEADERS_BOOLEAN,
}
exports.CSV_DATA_URL = 'https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv';

exports.SEARCH_INDEX_NAME = 'artworks';
