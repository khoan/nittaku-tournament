// TODO cipher sensitive source
// https://github.com/rndme/aes4js/blob/master/aes4js.js
// https://gist.github.com/chrisveness/43bcda93af9f646d083fad678071b90a
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt

import {mount, el, list} from '../../redom.es.js';

export default class {
  constructor (id, source) {
    this.id = id;

    this.root = document.querySelector('#app');

    this.el = el('a.f6.link.dim.br1.ph3.pv2.mb2.dib.white.bg-dark-blue', 'Show links', {href: 'javascript:void(0)'});
    this.el.onclick = e => this.onClick(e);

    if (source.pass && source.data) {
      // TODO
      // source.iv = "";
      // source.salt = "";
      // source.encrypted = "";
      // console.log(source);
    }

    this.render();
  }

  render () {
    mount(this.root, this);
  }

  onClick (event) {
    event.preventDefault();

    // TODO dialog asking for password
    // use password to decrypt source.encrypted
    // show source links
  }
}
