// TODO cipher sensitive source
// https://github.com/rndme/aes4js/blob/master/aes4js.js
// https://gist.github.com/chrisveness/43bcda93af9f646d083fad678071b90a
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
// https://github.com/mdn/dom-examples/blob/master/web-crypto/derive-key/pbkdf2.js

import {mount, el, list, place} from '../../redom.es.js';

export default class {
  constructor (id, links) {
    this.id = id;

    this.links = links;

    this.root = document.querySelector('#app');

    this.el = el('form.pv4',
      el('label.f6.b.db.mb2', 'Password', {for: 'password'}),
      this.pass = el('input#password.input-reset.ba.b--black-20.pa2.mb2.measure-narrow.dib', {type: 'password'}),
      el('button.dim.dib.br1.ba.ph3.pv2.ml2.black.bg-transparent.pointer', {type: 'submit'}, 'Encrypt'),
      this.result = place(Result)
    );
    this.el.onsubmit = e => this.onSubmit(e);

    this.render();
  }

  render () {
    mount(this.root, this);
  }

  onSubmit (event) {
    event.preventDefault();

    this.encrypt().then(result => {
      this.result.update(
        true,
        JSON.stringify(result, (key, value) => key && value ? value.toString() : value, "  ")
      );
      this.decrypt(result).then(plaintext => console.log(plaintext));
    });
  }

  async encrypt () {
    if (! this.links.data) { return }

    let plaintext = JSON.stringify(this.links.data);
    let ciphertext;
    let iv = window.crypto.getRandomValues(new Uint8Array(12));
    let salt = window.crypto.getRandomValues(new Uint8Array(16));

    let encoder = new TextEncoder('utf-8');
    let decoder = new TextDecoder('utf-8');

    let key = await window.crypto.subtle.importKey('raw', encoder.encode(this.pass.value), {name: 'PBKDF2'}, false, ['deriveBits', 'deriveKey']);
    key = await window.crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: 100*1000, hash: 'SHA-256'}, key, {name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);

    ciphertext = await window.crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, encoder.encode(plaintext));

    return {
      iv: iv
    , salt: salt
    , ciphertext: new Uint8Array(ciphertext)
    };
  }

  async decrypt ({iv, salt, ciphertext}) {
    let encoder = new TextEncoder('utf-8');
    let decoder = new TextDecoder('utf-8');

    let key = await window.crypto.subtle.importKey('raw', encoder.encode(this.pass.value), {name: 'PBKDF2'}, false, ['deriveBits', 'deriveKey']).then(keyMaterial =>
      window.crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: 100*1000, hash: 'SHA-256'}, keyMaterial, {name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt'])
    )
    let plaintext = await window.crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, ciphertext);

    return decoder.decode(plaintext);
  }
}

class Result {
  constructor () {
    this.el = el('.mv5',
      this.result = el('textarea.w-100.vh-25')
    );
  }

  update (data) {
    this.result.value = data;
  }
}
