import {mount} from '../../redom.es.js';
import EntrySearch from './search.es.js';
import EntryList from './list.es.js';

export default class App {
  constructor (root, silo) {
    this.root = root;
    this.silo = silo;

    this.entrySearch = new EntrySearch(silo);

    this.render();
  }

  render () {
    mount(root, this.entryList);
    mount(root, this.entrySearch);
  }
}

/*
<div id="entry-search" data-source-url="">
  <form class="black-80">
    <label for="name" class="f6 b db mb2"></label>
    <input id="name" class="input-reset ba b--black-20 pa2 mb2 dib w-100 measure" type="text" aria-describedby="name-desc">
    <button id="search" class="input-reset dim br1 ba ph3 pv2 mb2 dib black bg-transparent">Entry Search</button>
    <button id="show-all" class="input-reset dim br1 ba ph3 pv2 mb2 dib black bg-transparent">Show All</button>
    <small id="name-desc" class="f6 black-60 db mb2">Enter Name or Rating Central ID</small>
  </form>
</div>

<div id="entry-list" class="w-100 mv4 overflow-scroll" data-source-url="{{< meta "source-url" >}}"></div>
*/
