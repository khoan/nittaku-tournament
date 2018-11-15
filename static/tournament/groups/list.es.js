import {el, list, text, place, mount} from '../../redom.es.js';

export default class {
  constructor (root, silo) {
    this.root = root;
    this.silo = silo;

    this.el = list('#groups', Event);

    silo.data.then(data => {
      this.update(data);
      this.render();
    });
  }

  update (data) {
    this.el.update(data);
  }

  render () {
    mount(this.root, this);
  }
}

class Event {
  constructor () {
    this.el = el('.mv5.overflow-scroll',
      this.eventName = el('h3.bb.b--light-gray'),
      this.nogroups = place(Text),
      this.groups = place(Table)
    )
  }

  update (data) {
    var groups = data.groups.filter(group => group.data.length > 0);

    this.eventName.textContent = data.name;

    if (groups.length > 0) {
      this.nogroups.update(false);
      this.groups.update(true, groups);
    } else {
      this.nogroups.update(true, 'No groups');
      this.groups.update(false);
    }
  }
}

class Text {
  constructor () {
    this.el = text('');
  }

  update (data) {
    this.el.textContent = data;
  }
}

class Table {
  constructor () {
    this.el = el('table.w-100.collapse',
      el('thead',
        el('tr',
          el('th', 'Group'),
          el('th', 'Players')
        )
      ),
      this.tbody = list('tbody', Group)
    );
  }

  update (data) {
    this.tbody.update(data);
  }
}

class Group {
  constructor () {
    this.el = list('tr.nowrap.striped--light-gray', Item);
  }

  update (data) {
    var specs = [
      {node: 'th', text: data.header.replace('Group ', '')},
      data.data
    ];

    this.el.update(specs);
  }
}

class Item {
  constructor (initData, item) {
    if (item.node) {
      this.el = el(item.node);
    } else {
      this.el = list('td', Player);
    }
  }

  update (data) {
    if (data.text) {
      this.el.textContent = data.text;
    } else {
      this.el.update(data);
    }
  }
}

class Player {
  constructor (initData, item, i) {
    this.el = el(`span.dib.w-25.truncate${0 < i ? '.ml3' : ''}`);
  }

  update (data) {
    this.el.textContent = data;
  }
}
