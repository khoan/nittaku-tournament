import {mount, el} from '../../redom.es.js';
import EntryList from './list.es.js';

// TODO support autosuggest when searching by names or ID
export default class EntrySearch {
  constructor (root, silo, lastUpdated) {
    this.root = root;
    this.silo = silo;
    this.lastUpdated = lastUpdated || new Date(this.silo.fetchedAt).toLocaleString();

    this.el = el('#entry-search',
      this.form = el('form.black-80',
        this.hint = el('small.f6.black-60.db.mb2', {id: 'name-desc'}, 'Enter Name or Ratings Central ID'),
        this.query = el('input.input-reset.ba.b--black-20.pa2.mb2.mr2.dib.w-100.measure-narrow', {type: 'text', 'aria-describedby': 'name-desc'}),
        this.search = el('button.input-reset.dim.br1.ba.pr3.pv2.dib.black.bg-transparent', 'Entry Search'),
        this.list = el('button.input-reset.dim.br1.ba.ph3.pv2.ml2.dib.black.bg-transparent', 'Show All')
      )
    );

    this.el.onsubmit = e => {
      e.preventDefault();
      this.search.click();
    }

    this.search.onclick = e => {
      e.preventDefault();
      this.onSearch();
    }

    this.list.onclick = e => {
      e.preventDefault();
      this.onList();
    }

    this.entryList = new EntryList;
    this.summary = el('.mt4');

    this.render();
  }

  render () {
    mount(this.root, this);
    mount(this.root, this.summary);
    mount(this.root, this.entryList);
  }

  /**
   * search silo by name or Central Rating ID
   * update entry list with result
   */
  onSearch () {
    var name = 0; // name column index
    var rcID = 1; // Ratings Central ID column index
    var pattern = parseInt(this.query.value);
    var query; 

    // name search
    if (isNaN(pattern)) {
      pattern = this.query.value.trim();
      if (pattern) {
        pattern = new RegExp('\\b'+pattern, 'i');
        query = entry => entry[name].match(pattern);
      }

    // Ratings Central ID search
    } else {
      query = entry => entry[rcID] == pattern;
    }

    if (query) {
      this.silo.data.then(data => {
        var filtered = {
          headers: data.headers,
          data: data.data.filter(query)
        };

        this.entryList.update(filtered);
        this.summarize(filtered.data.length);
      });
    } else {
      this.entryList.update();
      this.summarize(0);
    }
  }

  /**
   * update entry list with all entries from silo
   */
  onList () {
    this.silo.data.then(data => {
      this.entryList.update(data);
      this.summarize(this.entryList.count());
    });
  }

  summarize (count) {
    let summary;

    if (count === 0) {
      summary = 'No entries found'
    } else {
      summary = `${count} ${count > 1 ? 'entries' : 'entry'} found`
    }

    this.summary.textContent = `${summary}, last updated at ${this.lastUpdated}`;
  }
}
