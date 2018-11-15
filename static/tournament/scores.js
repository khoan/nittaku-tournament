import {mount, el, list, router} from '../../redom.es.js';
import Silo from './scores/silo.es.js';
import GroupResult from './scores/group.es.js';
import KnockoutResult from './scores/knockout.es.js';

export default class {
  constructor (id, sources) {
    this.silo = new Silo(id, sources);

    this.root = document.querySelector('#app');
    this.el = el('form',
      this.events = list('select', Option),
      this.draws = list('select.mh2', Option),
      this.submit = el('button.pointer.input-reset.dim.br1.ba.ph2.dib.black.bg-transparent', {type: 'submit'}, 'Show Result')
    );

    let events = this.silo.events.map(e => e.name)
    this.events.el.onchange = e => this.onEventChange(e);
    this.events.update(events);

    this.el.onsubmit = e => this.onShowResult(e);

    this.result = new Result(this.silo);

    let selected = location.search.match(/event=([^&]+)/);
    if (selected) {
      this.events.el.selectedIndex = events.indexOf(e => e === selected[1])+1;
    }
    selected = location.search.match(/draw=([^&]+)/);
    if (selected) {
      this.selected = [selected[1]];
    }

    this.render();

    this.events.el.onchange();
  }

  render () {
    mount(this.root, this);
    mount(this.root, this.result);
  }

  onEventChange (nativeEvent) {
    let event = this.events.el.options[this.events.el.selectedIndex];
    let selected = this.selected && this.selected.shift();

    this.silo.draws(event.value).then(
      draws => this.draws.update(draws, selected)
    ).then(() => {
      if (selected) {
        this.el.onsubmit();
      }
    });
  }

  onShowResult (event) {
    if (event) {
      event.preventDefault();
    }

    let eventName = this.events.el.options[this.events.el.selectedIndex].value;
    let drawName = this.draws.el.options[this.draws.el.selectedIndex].value;

    this.result.update(eventName, drawName);
  }
}

class Option {
  constructor () {
    this.el = el('option');
  }

  update (value, i, data, context) {
    this.el.value = value;
    this.el.textContent = value;
    this.el.selected = value.match(new RegExp(context, 'i'));
  }
}

class Result {
  constructor (silo) {
    this.silo = silo;

    this.el = el('.result.mt5',
      this.title = el('h3'),
      this.body = router('.body', {
        group: GroupResult,
        knockout: KnockoutResult
      })
    );
  }

  update (eventName, drawName) {
    this.title.textContent = eventName+' '+drawName+' Result';

    this.silo.scores(eventName, drawName).then(draw => {
      if (draw.matches) {
        this.body.update('group', draw);
      } else if (draw.rounds) {
        this.body.update('knockout', draw);
      }
    });
  }
}
