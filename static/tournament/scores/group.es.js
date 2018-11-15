import {el, list, text} from '../../redom.es.js';
import Chevron from '../../parts/chevron.es.js';

export default class {
  constructor () {
    this.el = list('ul.list.pl0', MatchResult);
  }

  update (draw) {
    this.el.update(draw.matches);
  }
}

class MatchResult {
  constructor (initData, item) {
    this.el = el('li.flex.items-start.pv3.bb.b--light-gray',
      this.scores = list(
        el('table.collapse', {style: 'table-layout: fixed'}),
        list.extend('tr', ScoreCell)
      )
    );

    this.scoresLink = el('a.link.dim.black', {href: 'javascript:void(0)'},
      text('Games'),
      el('span.dib.w1.h1.v-btm',
        this.chevron = (new Chevron('right')).el
      )
    );

    this.scoresLink.onclick = e => this.onClick(e);
  }

  update (data) {
    this.data = data;

    let players = data.name.split(' vs ');
    let outcome = [0, 0];

    for (let score of data.scores) {
      if (score[0] > score[1]+1) {
        if (score[0] > 10) {
          outcome[0] += 1;
        }
      } else if (score[1] > score[0]+1) {
        if (score[1] > 10) {
          outcome[1] += 1;
        }
      }
    }

    let scores = [
      [{text: undefined, class: 'w5'}, {text: 'Games', class: 'bb b--light-silver nowrap'}],
      [{text: players[0], class: 'pr4 truncate'}, {text: outcome[0], node: 'th', class: 'tc ph3'}],
      [{text: players[1], class: 'pr4 truncate'}, {text: outcome[1], node: 'th', class: 'tc ph3'}]
    ];

    if (data.scores.some(score => score[0] || score[1])) {
      scores[0][1].children = [this.scoresLink];
    }

    if(this.showScores) {
      data.scores.forEach((score, i) => {
        if (score[0] || score[1]) {
          scores[0].push({text: i+1, class: 'tc ph3 bb b--light-silver'});
          scores[1].push({text: score[0], class: 'tc ph3 nowrap'});
          scores[2].push({text: score[1], class: 'tc ph3 nowrap'});
        }
      });
    }

    this.scores.update(scores);
  }

  onClick (event) {
    this.showScores = this.chevron.classList.toggle('rotate-180');
    this.update(this.data);
  }
}

class ScoreCell {
  constructor (initData, item, i) {
    let node
    if (item) {
      node = item.node;
    }
    this.el = el(node || 'td');

    if (item && item.class) {
      this.el.classList.add(...item.class.split(' '));
    }
  }

  update (data) {
    if (typeof data === 'object') {
      if ('children' in data) {
        this.el.textContent = '';
        data.children.forEach(child => this.el.appendChild(child));
        return;
      } else if ('text' in data) {
        this.el.textContent = data.text;
        return;
      } 
    }

    this.el.textContent = data;
  }
}
