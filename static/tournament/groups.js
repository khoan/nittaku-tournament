import Silo from './groups/silo.es.js';
import GroupList from './groups/list.es.js';

export default class {
  constructor (id, sourceUrl) {
    // TODO pass in event id so silo can create namespaced cache
    this.silo = new Silo(sourceUrl);
    this.root = document.querySelector('#app');
    this.groups = new GroupList(this.root, this.silo);
  }
}
