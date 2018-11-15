// reference http://blog.krawaller.se/posts/exploring-a-css3-tournament-bracket/
import {el, list, text, place} from '../../redom.es.js';
import Chevron from '../../parts/chevron.es.js';

export default class {
  constructor () {
    let parent = el('.flex', {style: 'width: 100vw'});
    this.el = list(parent, Round);
  }

  update (draw) {
    this.el.update(draw.rounds);
  }
}

class Round {
  constructor () {
    this.el = list('ul.list.pl0.flex.flex-column.bracket.w5', Line);
  }

  update (data) {
    let matches = [];

    // process matches
    data.matches.forEach( (match, i) => {
      let players = match.name ? match.name.split(' vs ') : [undefined, undefined];
      let outcome = [0, 0];
      let scores = [[], []];

      for (let score of match.scores) {
        if (score[0] !== undefined) {
          scores[0].push(score[0]);
        }
        if (score[1] !== undefined) {
          scores[1].push(score[1]);
        }

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

      if (scores[0].length === 0) {
        outcome[0] = undefined;
        outcome[1] = undefined;
      }

      matches.push({player: players[0], games: outcome[0], scores: scores[0], class: 'pl2 bb b--light-silver'});
      matches.push({class: 'br b--light-silver min-h3', style: 'flex-grow: 1', html: '&nbsp;'});
      matches.push({player: players[1], games: outcome[1], scores: scores[1], class: 'pl2 bt b--light-silver'});
      if (i+1 !== data.matches.length) {
        matches.push({style: 'flex-grow: 1', html: '&nbsp;'});
      }


    });

    this.el.update(matches);
  }
}

class Line {
  constructor (initData, item) {
    let chevron = 'down';
    if (item.class && item.class.includes('bt')) {
      chevron = 'up';
    }

    let anchor;

    this.el = el('li.relative',
      (chevron === 'up' ? (this.scores = place(el('.absolute', {style: 'right: 5px; top: -20px'}))) : undefined),
      this.player = el('span.dib.mw4.truncate'),
      this.scoresLink = place(
        anchor = el('a.link.dim.black.fr', {href: 'javascript:void(0)'},
          this.games = text(''),
          el('span.dib.w1.h1.v-btm',
            this.chevron = (new Chevron(chevron)).el
          )
        )
      ),
      (chevron === 'down' ? (this.scores = place(el('.absolute', {style: 'right: 5px; bottom: -20px'}))) : undefined)
    );

    anchor.onclick = e => this.onClick(e)
  }

  update (data) {
    this.data = data;

    if (data) {
      if (data.class) {
        this.el.classList.add(...data.class.split(' '));
      }

      if (data.style) {
        this.el.style.cssText = data.style;
      }

      if (data.html) {
        this.el.innerHTML = data.html;
      } else {
        this.player.textContent = data.player || '...';

        if (data.games !== undefined) {
          this.games.textContent = data.games;
          this.scoresLink.update(true);

          this.scores.update(this.showScores);
          if (this.showScores) {
            this.scores.el.textContent = data.scores.join(', ');
          }
        }
      }
    }
  }

  onClick (event) {
    this.showScores = this.chevron.classList.toggle('rotate-180');
    this.update(this.data);
    console.log('click', this.showScores);
  }
}
