import Silo from './entries/silo.es.js';
import EntrySearch from './entries/search.es.js';

export default class {
  constructor (id, sourceUrl, lastUpdated) {
    this.silo = new Silo(id, sourceUrl);
    this.root = document.querySelector('#js-app');
    this.entries = new EntrySearch(this.root, this.silo, lastUpdated);
  }
}
