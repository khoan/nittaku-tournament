import {el, list, place} from '../../redom.es.js';

export default class {
  constructor () {
    this.el = el('#entry-list.w-100.mb5.overflow-scroll',
      this.result = place(Table)
    );
  }

  update (data) {
    if (!data || data.data.length === 0) {
      this.result.update(false);
    } else {
      //console.log('data', data.data);
      data.data = data.data.sort(function (a, b) {
        var ratingA = parseInt(a[2] || 0);
        var ratingB = parseInt(b[2] || 0);
        if (ratingA < ratingB) { return 1; }
        if (ratingA > ratingB) { return -1; }
        return 0;
      });
      this.result.update(true, data);
    }

    if (this.count() > 26) {
      this.result.el.classList.add('vh-75');
    }
  }

  count () {
    if (this.result.view) {
      return this.result.view.tbody.body.views.length;
    } else {
      return 0;
    }
  }
}

class Table {
  constructor () {
    this.el = el('table.collapse',
      this.thead = new Header,
      this.tbody = new Body(this.thead)
    );
  }

  update (data) {
    this.thead.update(data.headers);
    this.tbody.update(data.data);
  }
}

class Header {
  constructor () {
    this.el = el('thead');
    this.headers = list(
      this.el, Row, undefined, ['tr.near-white.bg-navy', 'tr.near-white.bg-dark-blue']
    );

    this.columnIndex = {};
  }

  update (data) {
    //console.log('headers', data);
    var specs = [];
    var row;

    row = [];
    for (var i=0; i < data.top.length; ++i) {
      var header = data.top[i].trim();

      if (header) {
        header = header.replace(/\bDouble\b/, 'Doubles');
        row.push({text: header, node: 'th'});
        this.columnIndex[header] = i;
      }
    }
    for (var i=0; i < row.length; ++i) {
      var column = row[i];
      var nextColumn = row[i+1];
      var nextColumnIndex = nextColumn ? this.columnIndex[nextColumn.text] : data.top.length;

      column.colspan = nextColumnIndex - this.columnIndex[column.text];
    }
    specs.push(row);

    row = [];
    for (var i=0; i < data.data.length; ++i) {
      var header = data.data[i].trim();
      var column = {class: 'nowrap i'};

      //console.log('header', header);

      if (header.startsWith('Player Name')) {
        column.html = header.replace(' (', '<br>(');
      } else if (header.startsWith('Ratings Central')) {
        column.html = header.replace(' ID', '<br>ID')
      } else if (header.startsWith('Rating ')) {
        column.html = header.replace('on', '<br>on').replace('as of ', 'as of<br>');
      } else {
        column.text = header;
      }

      if (i !== 0 && Object.values(this.columnIndex).includes(i)) {
        column.class += ' pl5';
      } else if (this.columnIndex['Doubles Partner'] < i) {
        column.class += ' pl3';
      } else if (this.columnIndex['Singles'] < i || 0 < i) {
        column.class += ' pl2';
      }

      row.push(column);
    }
    specs.push(row);

    this.headers.update(specs);
  }
}

class Body {
  constructor (thead) {
    this.thead = thead;
    this.el = el('tbody');
    this.body = list(this.el, Row);
  }

  update (data) {
    //console.log('body', data);

    var specs = [];
    var headers = this.thead.headers.views[1].el.views;

    for (var entry of data) {
      var isEmptyEntry = true;
      var row = [];

      for (var i=0; i < entry.length; ++i) {
        var text = entry[i].trim();
        if (text === 'TRUE' || text === 'on') {
          text = '✓';
        } else if (text === 'FALSE') {
          text = '';
        }
        entry[i] = text;
        if (text) {
          isEmptyEntry = false;
        }
      }

      if (isEmptyEntry) {
        continue;
      }

      for (var i=0; i < entry.length; ++i) {
        var column = {text: entry[i]};

        if (i === 0) {
          column.class = 'nowrap';
        } else if (0 < i && i < this.thead.columnIndex['Singles']) {
          column.class = `tc ${headers[i].el.className.match(/pl\d/)[0]}`;
        } else if (i < this.thead.columnIndex['Doubles Partner']) {
          column.class = `tc ${headers[i].el.className.match(/pl\d/)[0]}`;
          if (column.text) {
            column.title = `${headers[i].el.textContent} Singles`;
          }
        } else {
          column.class = `nowrap ${headers[i].el.className.match(/pl\d/)[0]}`;
          if (column.text) {
            column.title = `${headers[i].el.textContent} Doubles Partner`;
          }
        }

        row.push(column);
      }

      specs.push(row);
    }

    this.body.update(specs);
  }
}

class Row {
  constructor (initData, item, i) {
    var node;
    if (initData) {
      node = initData[i];
    } else {
      node = 'tr.three-striped--light-gray';
    }
    this.el = list(node, Cell);
  }

  update (data) {
    this.el.update(data);
  }
}

class Cell {
  constructor (initData, item) {
    var node, attrs;
    try {
      'node' in item;
      node = item.node;
      attrs = Object.assign({}, item);
      delete attrs.node;
      delete attrs.text;
      delete attrs.html;
    } catch { }

    node || (node = 'td');
    this.el = el(node, attrs);
  }

  update (data) {
    if (data.html) {
      this.el.innerHTML = data.html;
    } else {
      try {
        'text' in data;
        this.el.textContent = data.text;
      } catch {
        this.el.textContent = data;
      }
    }
  }
}
