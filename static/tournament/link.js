import {mount, el, list, text} from '../../redom.es.js';
import ExternalLink from '../../parts/external-link.es.js';

export default class {
  constructor (source, selector) {
    let on = location.search.match(/\bon=([^;&]+)/);
    if (on) {
      localStorage.setItem('on', on[1]);
    }
    on = localStorage.getItem('on').match(/\blink\b/);

    if (!on) { return }

    this.source = source;
    this.selector = selector;

    this.el = el('label.hover-near-black.pointer', {for: 'modal-link-trigger'},
      (new ExternalLink).el
    );
    this.root = document.querySelector('.js-link');

    this.modal = el('.modal',
      this.modalTrigger = el('input#modal-link-trigger.checkbox', {type: 'checkbox'}),
      el('.modal-overlay',
        el('label.o-close', {for: 'modal-link-trigger'}),
        el('.modal-wrap',
          el('label.close', '✖', {for: 'modal-link-trigger'}),
          this.modalForm = el('form',
            el('label.db.fw4.lh-copy.f6', 'Password', {for: 'password'}),
            this.modalPass = el('input#password.dib.input-reset.ba.b--black-20.pa2', {type: 'password'}),
            el('button.dim.br1.ba.ph3.pv2.ml2.dib.black.bg-transparent', 'Go', {type: 'submit'})
          ),
          this.modalResult = list('ul.list.pl0', Item)
        )
      )
    );

    this.modalForm.onsubmit = e => this.onSubmit(e);

    this.render();
  }

  render () {
    mount(this.root, this);
    mount(document.body, this.modal);
  }

  async onSubmit (event) {
    event.preventDefault();
    let {iv, salt, encrypted} = this.source;

    iv = Uint8Array.from(iv.split(','));
    salt = Uint8Array.from(salt.split(','));
    let ciphertext = Uint8Array.from(encrypted.split(','));

    let encoder = new TextEncoder('utf-8');
    let decoder = new TextDecoder('utf-8');

    try {
      let key = await window.crypto.subtle.importKey('raw', encoder.encode(this.modalPass.value), {name: 'PBKDF2'}, false, ['deriveBits', 'deriveKey']).then(keyMaterial =>
        window.crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: 100*1000, hash: 'SHA-256'}, keyMaterial, {name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt'])
      )
      let plaintext = await window.crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, ciphertext);
      plaintext = decoder.decode(plaintext);

      let result = JSON.parse(plaintext);
      let type = typeof result[this.selector];

      if (type === 'string') {
        this.modalResult.update([[this.selector, result[this.selector]]]);
      } else {
        console.log(Object.entries(result[this.selector]));
        this.modalResult.update(Object.entries(result[this.selector]));
      }
    } catch (e) {
      console.error('fail to decrypt', e);
    }
  }
}

class Item {
  constructor () {
    this.el = el('li',
      this.link = el('a.link.dim',
        this.linkText = text(''),
        el('span.dib.w1.h1.v-mid', (new ExternalLink).el)
      )
    )
  }

  update (data) {
    this.link.href = data[1];
    this.linkText.textContent = data[0];
  }
}
