import Silo from './entries/silo.es.js';
import EntrySearch from './entries/search.es.js';

export default class {
  constructor (id, sourceUrl) {
    // TODO pass in event id so silo can create namespaced cache
    this.silo = new Silo(sourceUrl);
    this.root = document.querySelector('#js-app');
    this.entries = new EntrySearch(this.root, this.silo);
  }
}
