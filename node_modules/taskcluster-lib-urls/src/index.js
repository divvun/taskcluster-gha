const assert = require('assert');

const normalizeRootUrl = rootUrl => rootUrl.replace(/\/*$/, '');
const cleanPath = path => path.replace(/^\/*/, '');

class Urls {
  constructor(rootUrl) {
    this.rootUrl = normalizeRootUrl(rootUrl);
  }

  /**
   * Generate URL for path in a Taskcluster service.
   */
  api(service, version, path) {
    return `${this.rootUrl}/api/${service}/${version}/${cleanPath(path)}`;
  }

  /**
   * Generate URL for the api reference of a Taskcluster service.
   */
  apiReference(service, version) {
    return `${this.rootUrl}/references/${service}/${version}/api.json`;
  }

  /**
   * Generate URL for path in the Taskcluster docs website.
   */
  docs(path) {
    return `${this.rootUrl}/docs/${cleanPath(path)}`;
  }

  /**
   * Generate URL for the exchange reference of a Taskcluster service.
   */
  exchangeReference(service, version) {
    return `${this.rootUrl}/references/${service}/${version}/exchanges.json`;
  }

  /**
   * Generate URL for the schemas of a Taskcluster service.
   * The schema usually have the version in its name i.e. "v1/whatever.json"
   */
  schema(service, schema) {
    return `${this.rootUrl}/schemas/${service}/${cleanPath(schema)}`;
  }

  /**
   * Generate URL for the api reference schema
   */
  apiReferenceSchema(version) {
    return this.schema('common', `api-reference-${version}.json`);
  }

  /**
   * Generate URL for the exchanges reference schema
   */
  exchangesReferenceSchema(version) {
    return this.schema('common', `exchanges-reference-${version}.json`);
  }

  /**
   * Generate URL for the api manifest schema
   */
  apiManifestSchema(version) {
    return this.schema('common', `manifest-${version}.json`);
  }

  /**
   * Generate URL for the metadata metaschema
   */
  metadataMetaschema() {
    return this.schema('common', 'metadata-metaschema.json');
  }

  /**
   * Generate URL for Taskcluser UI.
   */
  ui(path) {
    return `${this.rootUrl}/${cleanPath(path)}`;
  }

  /**
   * Returns a URL for the service manifest of a taskcluster deployment.
   */
  apiManifest() {
    return `${this.rootUrl}/references/manifest.json`;
  }
}

const withRootUrl = rootUrl => new Urls(rootUrl);

module.exports = {
  /**
   * Generate URLs for redeployable services and entities from
   * an initial root URL.
   */
  Urls,

  /**
   * Generate URLs for either redeployable or legacy services and entities
   * from an initial root URL.
   */
  withRootUrl,

  /**
   * Generate URL for path in a Taskcluster service.
   */
  api(rootUrl, service, version, path) {
    return withRootUrl(rootUrl).api(service, version, path);
  },

  /**
   * Generate URL for the api reference of a Taskcluster service.
   */
  apiReference(rootUrl, service, version) {
    return withRootUrl(rootUrl).apiReference(service, version);
  },

  /**
   * Generate URL for path in the Taskcluster docs website.
   */
  docs(rootUrl, path) {
    return withRootUrl(rootUrl).docs(path);
  },

  /**
   * Generate URL for the exchange reference of a Taskcluster service.
   */
  exchangeReference(rootUrl, service, version) {
    return withRootUrl(rootUrl).exchangeReference(service, version);
  },

  /**
   * Generate URL for the schemas of a Taskcluster service.
   */
  schema(rootUrl, service, version, schema) {
    return withRootUrl(rootUrl).schema(service, version, schema);
  },

  /**
   * Generate URL for the api reference schema
   */
  apiReferenceSchema(rootUrl, version) {
    return withRootUrl(rootUrl).apiReferenceSchema(version);
  },

  /**
   * Generate URL for the exchanges reference schema
   */
  exchangesReferenceSchema(rootUrl, version) {
    return withRootUrl(rootUrl).exchangesReferenceSchema(version);
  },

  /**
   * Generate URL for the api manifest schema
   */
  apiManifestSchema(rootUrl, version) {
    return withRootUrl(rootUrl).apiManifestSchema(version);
  },

  /**
   * Generate URL for the metadata metaschema
   */
  metadataMetaschema(rootUrl) {
    return withRootUrl(rootUrl).metadataMetaschema();
  },

  /**
   * Generate URL for Taskcluster UI.
   */
  ui(rootUrl, path) {
    return withRootUrl(rootUrl).ui(path);
  },

  /**
   * Returns a URL for the service manifest of a taskcluster deployment.
   */
  apiManifest(rootUrl) {
    return withRootUrl(rootUrl).apiManifest();
  },

  /**
   * Return the standardized taskcluster "testing" rootUrl.
   * Useful for nock and such things.
   */
  testRootUrl() {
    return 'https://tc-tests.example.com';
  },

  /**
   * Return the normal form of this rootUrl
   */
  normalizeRootUrl,
};
