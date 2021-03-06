import Silo from './groups/silo.es.js';
import GroupList from './groups/list.es.js';

export default class {
  constructor (id, sourceUrl) {
    this.silo = new Silo(id, sourceUrl);
    this.root = document.querySelector('#js-app');
    this.groups = new GroupList(this.root, this.silo);
  }
}
