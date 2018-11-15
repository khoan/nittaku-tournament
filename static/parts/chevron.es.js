import {svg} from '../redom.es.js';

export default class {
  constructor (chevron) {
    if (chevron === 'right') {
      chevron = svg('path', {d: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'});
    } else if (chevron === 'up') {
      chevron = svg('path', {d: 'M7.41 13.17L12 8.59l4.59 4.58L18 11.76l-6-6-6 6 1.41 1.41z'});
    } else if (true || chevron === 'down') {
      chevron = svg('path', {d: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z'});
    }

    this.el = svg('svg', {viewBox: '0 0 24 24'},
      chevron
    );
  }
}
