import {svg} from '../redom.es.js';

export default class {
  constructor () {
    this.el = svg('svg', {viewBox: '0 0 24 24'},
      svg('path', {'fill-rule': 'evenodd', d: 'M2,12 L2,2 L5,2 L5,0 L2,0 C0.89,0 0,0.9 0,2 L0,12 C0,13.1 0.89,14 2,14 L12,14 C13.1,14 14,13.1 14,12 L14,9 L12,9 L12,12 L2,12 Z M7,2 L10.59,2 L4.76,7.83 L6.17,9.24 L12,3.41 L12,7 L14,7 L14,0 L7,0 L7,2 Z', transform: 'translate(2 2)'})
    );
  }
}
