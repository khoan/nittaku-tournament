// TODO hcaptcha

import {mount, el, list, text, place, setStyle, setAttr} from '../../redom.es.js';

let debounce = function (fn, milliseconds) {
  let timer;

  return function () {
    let that = this;
    let args = arguments;

    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(that, args), milliseconds);
  }
}

//let NOW = Date.parse('1 October 2019') || Date.now();
let NOW = Date.now();
let DUST = (location.search.match(/dust=([^&;]+)/) || [])[1] || '';
let PLAYER_NAME = decodeURIComponent((location.search.match(/PlayerName=([^&;]+)/) || [])[1] || '');

export default class Form {
  constructor (yyyymm, options) {
    options || (options = {});

    this.rootSelector = options.rootSelector || '#js-app';

    this.dust = options.dust || DUST;

    this.startDate = this.parseDate(options['start-date'], '00:00:00+10:00');
    options.startDate = this.startDate;
    this.stopDate = this.parseDate(options['stop-date'], '23:59:59.999+10:00');
    options.stopDate = this.stopDate;

    this.action = options.action || 'create';
    this.url = options.actionUrl || options['resource-url'];

    this.events = options.events;

    this.root = document.querySelector(this.rootSelector);

    this.eventInputs = {singles: [
      new SinglesInput({id: 'SinglesOpen', label: 'Open', form: this}),
      new SinglesInput({id: 'SinglesDiv1', label: 'Division 1', form: this}),
      new SinglesInput({id: 'SinglesDiv2', label: 'Division 2', form: this}),
      new SinglesInput({id: 'SinglesDiv3', label: 'Division 3', form: this}),
      new SinglesInput({id: 'SinglesDiv4', label: 'Division 4', form: this}),
      new SinglesInput({id: 'SinglesDiv5', label: 'Division 5', form: this})
    ], doubles: [
      new DoublesInput({id: 'DoublesOpen', label: 'Open', form: this}),
      new DoublesInput({id: 'DoublesDiv1a2', label: 'Division 1 & 2', form: this}),
      new DoublesInput({id: 'DoublesDiv3', label: 'Division 3', form: this}),
      new DoublesInput({id: 'DoublesDiv4a5', label: 'Division 4 & 5', form: this})
    ]};

    this.form = el('form', {method: 'post', action: this.url},
      el('input', {type: 'hidden', name: 'Action', value: this.action}),
      el('input', {type: 'hidden', name: 'Dust', value: this.dust}),

      this.info = place(InfoBox),

      el('fieldset.bn.ph0.pb4',
        el('legend.fw7.mb2', 'Player Details'),

        this.playerName = new PlayerNameInput({proxy: this.url, form: this}),
        this.playerRatingsCentralId = new PlayerRatingsCentralIdInput({proxy: this.url}),

        el('.measure.mb3',
          el('label.f6.b.db.mb2', {'for': 'Phone'}, 'Phone'),
          el('input#Phone.input-reset.ba.b--black-20.pa2.mb2.db.w-100', {name: 'Phone', type: 'tel', required: true})
        ),

        el('.measure.mb3',
          el('label.f6.b.db.mb2', {'for': 'Email'}, 'Email'),
          el('input#Email.input-reset.ba.b--black-20.pa2.mb2.db.w-100', {name: 'Email', type: 'email', required: true})
        ),

        this.playerDateOfBirth = new DateInput({id: 'DateOfBirth', label: 'Date of Birth'}),

        this.playerRating = new PlayerRatingInput({form: this}),
      ),
      el('fieldset.bn.ph0.pb4',
        el('legend.fw7.mb2', 'Singles Event'),
        ...this.eventInputs.singles
      ),
      el('fieldset.bn.ph0.pb4',
        el('legend.fw7.mb2', 'Doubles Event'),
        el('.mb3', 'When partner name is left blank, you will be matched to a partner.'),
        ...this.eventInputs.doubles
      ),

      el('.flex.items-center.mb2',
        this.terms = el('input#acceptance.mr1', {type: 'checkbox'}),
        el('label', {'for': 'acceptance'},
          'I have read and accepted ',
          el('a.link.dim', {href: '/'+yyyymm+'/#conditions', target: '_blank'}, 'tournament conditions'),
          '.'
        )
      ),

      el('.flex.items-center.mb2',
        this.payment = el('input#payment.mr1', {type: 'checkbox'}),
        el('label', {'for': 'payment'}, 'I will pay ', this.cost = text(''), ' before my first match.')
      ),

      this.submitInput = el('input.b.ph3.pv2.mr2.mv4.button-reset.f6.dib', {type: 'submit'}),
      el('a.link.dim.ph3.pv2.mv4.ba.black.b--black.bg-transparent.f6.dib', {href: '/201910/#entry'}, 'Cancel'),

      this.withdraw = place(WithdrawBox, options)
    );

    this.playerRatingsCentralId.onRatingsCentralId = id => this.playerDateOfBirth.toggle(!id);

    this.playerName.related = [this.playerRatingsCentralId, this.playerRating];
    this.playerRatingsCentralId.related = [this.playerName, this.playerRating];

    this.terms.oninput = e => this.updateSubmitInput();
    this.payment.oninput = e => this.updateSubmitInput();
    this.form.onsubmit = e => this.onSubmit(e);

    this.render();

    this.load().then(async entry => {
      if (entry) {
        this.withdraw.update(true);

        let ratingsCentral = new RatingsCentral({proxy: this.url});
        if (entry['RatingsCentralID']) {
          let players = await ratingsCentral.searchPlayers({PlayerID: entry['RatingsCentralID']});
          if (players.data.length > 0) {
            this.playerRating.update({
              rating: players.data[0][players.header.indexOf('Rating')]
            });
          }
        }
      }

      this.updateCost();
      this.eventInputs.doubles.forEach(doubles => doubles.partner.update(doubles.input.checked));
      this.updateSubmitInput();
    });

    setTimeout(() => this.motd(), 100);
  }

  load () {
    if (!this.dust) { return Promise.resolve() }

    this.info.update(true, {text: 'Loading entry of ' + PLAYER_NAME, flicker: true});

    let url = this.url + location.search + '&action=show';
    return fetch(url, {method: 'GET', redirect: 'follow'}).
      then(r => r.json()).
      then(json => {
        if (json.status === '200 OK') {
          let inputs = this.form.elements;
          for (let i = 0; i < inputs.length; ++i) {
            let input = inputs[i];
            if (input.name in json.body.entry) {
              if (input.type === 'checkbox') {
                input.checked = !!json.body.entry[input.name];
              } else {
                input.value = json.body.entry[input.name];
              }
            }
          }

          this.playerName.update({name: json.body.entry['PlayerName']});
          this.playerRatingsCentralId.update({id: json.body.entry['RatingsCentralID']});

          this.terms.checked = true;
          this.payment.checked = true;

          this.info.update(false);
        } else if (json.status === '404 Not Found') {
          this.info.update(true, {error: json.body.message.replace('Your', PLAYER_NAME) + ' Please contact tournament@nittakuaustralia.com.'});
        } else {
          this.info.update(true, {error: 'Fail to load entry of ' + PLAYER_NAME + ' because of error ' + json.body.lineNumber + '. Please report to tournament@nittakuaustralia.com.'});
        }

        return json.body.entry;
      });
  }

  motd () {
    if (NOW < this.startDate) {
      let date = new Date(this.startDate);
      let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      alert('Online entry opens on ' + days[date.getDay()] + ', ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear() + '.');
    } else if (this.stopDate < NOW) {
      alert('Entry have closed.');
    }
  }

  parseDate (date, time) {
    date = new Date(Date.parse(date));
    var yyyy = date.getFullYear();
    var mm = date.getMonth()+1;
    var dd = date.getDate();
    if (mm < 10) {
      mm = '0' + mm;
    }
    if (dd < 10) {
      dd = '0' + dd;
    }
    date = yyyy+'-'+mm+'-'+dd+'T'+time;
    return Date.parse(date);
  }

  updateCost () {
    let result = 0;

    for (let type in this.eventInputs) {
      result += this.eventInputs[type].reduce( (memo, input) => {
        if (input.input.checked) {
          let found = this.events[type].find(elem => elem.name === input.label.textContent);
          if (found) { memo += found.cost; }
        }
        return memo;
      }, 0);
    }

    if (result) {
      this.cost.textContent = '$' + result;
    } else {
      this.cost.textContent = '';
    }
  }

  updateEventInputs (options) {
    if (options.rating) {
      for (let type in this.eventInputs) {
        this.eventInputs[type].forEach( input => {
          let conf = this.events[type].find(elem => elem.name === input.label.textContent);

          // check rating
          if (conf.maxRating < options.rating) {
            if (input.input.checked) {
              input.input.checked = false;
              input.input.dispatchEvent(new Event('input'));
            }

            setAttr(input.input, {'disabled': 'disabled'});
            input.label.classList.add('black-50');
          } else {
            setAttr(input.input, {'disabled': ''});
            input.label.classList.remove('black-50');
          }
        });
      }
    }
  }

  updateSubmitInput () {
    let result = {
      ok: this.startDate < NOW && NOW < this.stopDate
    };

    if (result.ok) {
      result.ok = this.terms.checked && this.payment.checked;
    }

    if (result.ok) {
      // player name is present
      result.ok = this.playerName.input.value.includes(',') &&
        this.playerName.input.value.length > 4;
    }

    if (result.ok) {
      // at least one event is chosen
      result.ok = this.eventInputs['singles'].some(input => input.input.checked) ||
        this.eventInputs['doubles'].some(input => input.input.checked);
    }

    this.toggleSubmitInput(result.ok);
  }

  toggleSubmitInput (on) {
    if (on) {
      setAttr(this.submitInput, {'disabled': ''});
      this.submitInput.classList.add('dim', 'bg-dark-blue', 'white', 'pointer', 'bn');
    } else {
      setAttr(this.submitInput, {'disabled': 'disabled'});
      this.submitInput.classList.remove('bg-dark-blue', 'white', 'pointer', 'bn');
      this.submitInput.classList.add('ba', 'b--black-20', 'bg-transparent');
    }
  }

  onSubmit (e) {
    e.preventDefault();

    this.toggleSubmitInput(false);
    this.submitInput.value = 'Sending'

    let data = new FormData(this.form);

    fetch(this.form.action, {
      method: 'POST',
      body: data
    }).
      then(response => response.json()).
      then(json => {
        if (json.status === '200 OK') {
          alert(json.body.message);
        } else if (parseInt(json.status) < 500) {
          alert('Error', json.status, json.body.message);
        } else {
          alert('Error ' + json.body.lineNumber + '. Please report to tournament@nittakuaustralia.com');
        }
        this.toggleSubmitInput(true);
        this.submitInput.value = 'Submit'
      });
  }

  render () {
    mount(this.root, this.form);
  }
}

class RatingsCentral {
  constructor (initData) {
    this.proxy = initData.proxy;
    this.url = 'https://www.ratingscentral.com/';
  }

  searchPlayers (query) {
    query || (query = {});

    if (!query.PlayerName && !query.PlayerID) {
      return new Promise( r => r({ok: false}) );
    }

    query.PlayerSport || (query.PlayerSport = '1'); // Table Tennis
    query.CSV_Output || (query.CSV_Output = 'Text');

    //query.PlayerCountry = 'AUS'; // Australia
    //query.PlayerName (Last, First)
    //query.PlayerID

    let url = this.url + 'PlayerList.php?' + Object.keys(query).map(k => k + '=' + query[k]).join('&');
    url = this.proxy + '?action=proxy&url=' + encodeURIComponent(url);
    return fetch(url, {method: 'GET', redirect: 'follow'}).
      then(r => r.json()).
      then(j => this.parsePlayers(j.body));
  }

  // Name,ID,Rating,StDev,PrimaryClub,City,State,Province,PostalCode,Country,Deceased,Sex,Sport,USATT_ID,TTA_ID,LastPlayed,LastEvent
  // "Ng Kwai Susi, Hinarii",43071,1706,351,530,,,,,FRA,,F,1,0,0,2005-06-28,8181
  parsePlayers (blob) {
    let result = {header: undefined, data: []};

    blob.split('\n').forEach(function (row) {
      if (row.trim().length === 0) { return; }

      let columns = [];
      let quoteStart;
      let quoteEnd;
      let columnStart = 0;
      let columnEnd;

      for (let i in row) {
        i = parseInt(i);
        let chr = row[i];

        if (chr === '"') {
          if (typeof quoteStart === "number") {
            quoteEnd = i+1;
          } else {
            quoteStart = i;
          }
        } else if (chr === ',') {
          if (typeof quoteStart === "number") {
            if (typeof quoteEnd === "number") {
              columns.push(row.slice(quoteStart+1, quoteEnd-1));
              quoteStart = quoteEnd = undefined;
            }
          } else {
            columns.push(row.slice(columnStart, i));
          }
          columnStart = i + 1;
        } else if (i === row.length-1) {
          columns.push(row.slice(columnStart));
        }
      }

      if (!result.header) {
        result.header = columns;
      } else {
        result.data.push(columns);
      }
    });

    return result;
  }
}

class WithdrawBox {
  constructor (initData) {
    this.initData = initData;

    this.el = el('.bg-lightest-blue.navy.pa3.mb3',
      this.terms = el('input#withdraw-terms.mr2', {type: 'checkbox'}),
      el('label', {'for': 'withdraw-terms'}, PLAYER_NAME + ' withdraws and forfeits any payment if a draw has been made.'),
      el('.mt2',
        this.submit = el('input.b.ph3.pv2.mr2.button-reset.f6.dib', {type: 'submit', value: 'Withdraw'})
      )
    );

    this.terms.oninput = e => this.onInput(e);
    this.submit.onclick = e => this.onSubmit(e);

    this.toggle();
  }

  onInput (e) {
    if (NOW < this.initData.stopDate) {
      this.toggle(this.terms.checked);
    }
  }

  onSubmit (e) {
    this.toggle(false, 'Sending');

    e.preventDefault();

    this.url || (
      this.url = this.initData['resource-url'] + location.search + '&action=destroy'
    );

    return fetch(this.url, {method: 'POST'}).
      then(response => response.json()).
      then(json => {
        if (json.status === '200 OK') {
          alert(json.body.message);
        } else {
          alert('Error ' + json.body.lineNumber + '. Please report to tournament@nittakuaustralia.com');
        }
        this.toggle(true, 'Withdraw');
      });
  }

  toggle (on, text) {
    if (text) {
      this.submit.value = text;
    }

    if (on) {
      setAttr(this.submit, {'disabled': ''});
      this.submit.classList.add('dim', 'bg-dark-blue', 'white', 'pointer', 'bn');
    } else {
      setAttr(this.submit, {'disabled': 'disabled'});
      this.submit.classList.remove('bg-dark-blue', 'white', 'pointer', 'bn');
      this.submit.classList.add('ba', 'b--black-20', 'bg-transparent');
    }
  }
}

class InfoBox {
  constructor () {
    this.el = el('.flex.items-center.justify-center.pa2.mb3',
      this.message = el('span.lh-title', '')
    );
  }

  update (data) {
    this.message.textContent = data.text || data.error;
    this.message.classList[data.flicker ? 'add' : 'remove']('flicker');
    if (data.error) {
      this.el.classList.remove('bg-lightest-blue', 'navy');
      this.el.classList.add('bg-dark-red', 'washed-yellow');
    } else {
      this.el.classList.add('bg-lightest-blue', 'navy');
      this.el.classList.remove('bg-dark-red', 'washed-yellow');
    }
  }
}

class DateInput {
  constructor (initData) {
    this.el = el('.measure.mb3',
      el('label.f6.b.db.mb2', {'for': initData.id}, initData.label),

      el('.dib.mr2.mb2',
        el('label.f6.black-60', {'for': initData.id+'Day'}, 'Day'),
        this.day = el('input.input-reset.ba.b--black-20.pa2.db.w2', {id: initData.id+'Day'})
      ),

      el('.dib.mr2.mb2',
        el('label.f6.black-60', {'for': initData.id+'Month'}, 'Month'),
        this.month = el('input.input-reset.ba.b--black-20.pa2.db.w3', {id: initData.id+'Month', list: 'months'}),
        el('datalist#months',
          el('option', 'Jan'),
          el('option', 'Feb'),
          el('option', 'Mar'),
          el('option', 'Apr'),
          el('option', 'May'),
          el('option', 'Jun'),
          el('option', 'Jul'),
          el('option', 'Aug'),
          el('option', 'Sep'),
          el('option', 'Oct'),
          el('option', 'Nov'),
          el('option', 'Dec'),
          el('option', '1'),
          el('option', '2'),
          el('option', '3'),
          el('option', '4'),
          el('option', '5'),
          el('option', '6'),
          el('option', '7'),
          el('option', '8'),
          el('option', '9'),
          el('option', '10'),
          el('option', '11'),
          el('option', '12')
        )
      ),

      el('.dib.mr2.mb2',
        el('label.f6.black-60', {'for': initData.id+'Year'}, 'Year'),
        this.year = el('input.input-reset.ba.b--black-20.pa2.db.w3', {id: initData.id+'Year'})
      ),

      this.date = el('input', {id: initData.id, name: initData.id, type: 'hidden'})
    );

    this.day.oninput = e => this.onInput(e);
    this.month.oninput = e => this.onInput(e);
    this.month.onblur = e => this.onBlur(e);
    this.year.oninput = e => this.onInput(e);
  }

  toggle (active) {
    if (active) {
      this.el.classList.remove('dn');
    } else {
      this.el.classList.add('dn');
    }
  }

  update (data) {
    if (data) {
      let [day, month, year] = data.split(DateInput.separator);
      this.day.value = day;
      this.month.value = month;
      this.year.value = year;
    }
  }

  onBlur (e) {
    let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    let month = months[this.month.value-1] || this.month.value;
    this.month.value = month;
  }

  onInput (e) {
    let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    let month = months[this.month.value-1] || this.month.value;

    this.date.value = this.day.value + DateInput.separator + month + DateInput.separator + this.year.value;

    //if (typeof this.ondate === 'function') {
    //  this.ondate(Date.parse(this.date.value));
    //}
  }
}
DateInput.separator = ' ';

class NameOption {
  static toString (data) {
    return [data.name, data.id, data.country, data.rating].join(NameOption.separator);
  }

  static toObject (data) {
    data = data.split(NameOption.separator);
    return {name: data[0], id: data[1], country: data[2], rating: data[3]};
  }

  constructor () {
    this.el = el('option');
  }

  update (data) {
    this.el.value = NameOption.toString(data);
    this.el.label = 'Ratings Central ID ' + data.id;
  }
}
NameOption.separator = "\t";

class PlayerNameInput {
  constructor (initData) {
    this.form = initData.form;

    this.el = el('.measure.mb3',
      el('label.f6.b.db.mb2',
        'Name ',
        el('span.normal.black-60', '(Last name, First name)'),
        this.dummyInput = el('input.input-reset.ba.b--black-20.pa2.mt2.db.w-100', {type: 'text', list: 'namelist', required: true})
      ),
      this.input = el('input#PlayerName', {type: 'hidden', name: 'PlayerName'}),
      this.list = list('datalist#namelist', NameOption)
    );

    this.ratingsCentral = new RatingsCentral(initData);

    this.dummyInput.oninput = debounce(e => this.onInput(e), 300);
  }

  async onInput (e) {
    this.input.value = this.dummyInput.value;;
    this.form.updateSubmitInput();

    if (this.dummyInput.value.length === 0) {
      this.related.forEach(r => r.reset());
      return;
    }
    if (this.dummyInput.value.length < 2) { return; }

    if (this.dummyInput.value.includes(NameOption.separator)) {
      let data = NameOption.toObject(this.dummyInput.value);

      this.dummyInput.value = data.name;
      this.input.value = data.name;
      this.related.forEach(r => r.update(data));

    } else {
      let players;
      if (this.players) {
        let nameIndex = this.players.header.indexOf('Name');
        let nameRegex = new RegExp(this.dummyInput.value, 'i');
        players = this.players.data.filter(p => nameRegex.test(p[nameIndex]));
      }
      if (!players || players.length === 0) {
        this.players = await this.ratingsCentral.searchPlayers({PlayerName: this.dummyInput.value});
        players = this.players.data;
        this.list.update([]);
      }
      this.dummyInput.title = players.length + ' players found';
      if (players.length > 200) {
        this.list.update([]);
        return;
      }
      if (players.length < this.list.views.length) {
        return;
      }

      let nameIndex = this.players.header.indexOf('Name');
      let idIndex = this.players.header.indexOf('ID');
      let ratingIndex = this.players.header.indexOf('Rating');
      let countryIndex = this.players.header.indexOf('Country');
      let data = players.map(p => ({
        name: p[nameIndex],
        id: p[idIndex],
        rating: p[ratingIndex],
        country: p[countryIndex]
      }));
      this.list.update(data);
    }
  }

  reset () {
    this.input.value = '';
    this.dummyInput.value = '';
  }

  update (data) {
    this.input.value = data.name;
    this.dummyInput.value = data.name;
  }
}

class InputHint {
  constructor (initData) {
    this.el = el(initData.el || 'span.f6.black-60.db.mb2', 'text' in initData ? initData.text : 'Please supply hint')
  }

  update (data) {
    if (data) {
      this.el.textContent = data;
    }
  }
}

class IdOption {
  static toString (data) {
    return [data.id, data.name, data.country, data.rating].join(IdOption.separator);
  }

  static toObject (data) {
    data = data.split(IdOption.separator);
    return {id: data[0], name: data[1], country: data[2], rating: data[3]};
  }

  constructor () {
    this.el = el('option');
  }

  update (data) {
    this.el.value = IdOption.toString(data);
    this.el.label = data.name;
  }
}
IdOption.separator = "\t";

class PlayerRatingsCentralIdInput {
  constructor (initData) {
    this.el = el('.measure.mb3',
      this.input = el('input#RatingsCentralID', {name: 'RatingsCentralID', type: 'hidden'}),
      el('label.f6.b.db.mb2', 'Ratings Central ID',
        this.dummyInput = el('input.input-reset.ba.b--black-20.pa2.mt2.db.w-100', {type: 'text', list: 'idlist'})
      ),
      this.list = list('datalist#idlist', IdOption),
      this.hint = place(InputHint, {text: 'Leave blank if you have none'})
    );

    this.ratingsCentral = new RatingsCentral(initData);

    this.hint.update(true);
    this.dummyInput.addEventListener('input', debounce(e => this.onInput(e), 300));
  }

  async onInput (e) {
    if (this.dummyInput.value.includes(IdOption.separator)) {
      let data = IdOption.toObject(this.dummyInput.value);
      this.update(data);
    } else {
      let players;
      if (this.players) {
        let idIndex = this.players.header.indexOf('ID');
        players = this.players.data.filter(p => p[idIndex].includes(this.dummyInput.value));
      }
      if (!players || players.length === 0) {
        this.players = await this.ratingsCentral.searchPlayers({PlayerID: this.dummyInput.value});
        players = this.players.data;
        this.list.update([]);
      }
      this.dummyInput.title = players.length + ' players found';
      if (this.players.data.length > 200) {
        this.list.update([]);
        return;
      }
      if (players.length < this.list.views.length) {
        return;
      }

      let nameIndex = this.players.header.indexOf('Name');
      let idIndex = this.players.header.indexOf('ID');
      let ratingIndex = this.players.header.indexOf('Rating');
      let data = this.players.data.map(p => ({name: p[nameIndex], id: p[idIndex], rating: p[ratingIndex]}));
      this.list.update(data);
    }
  }

  reset () {
    this.input.value = '';
    this.dummyInput.value = '';
    this.hint.update(true);
  }

  update (data) {
    if (!data) {
      this.reset();
      return;
    }

    this.dummyInput.value = data.id;
    this.input.value = data.id;
    if (data.id) {
      if (typeof this.onRatingsCentralId === 'function') {
        this.onRatingsCentralId(data.id);
      }
      this.hint.update(false);
      this.related.forEach(r => r.update(data));
    }
  }
}

class PlayerRatingInput {
  constructor (initData) {
    this.form = initData.form;

    this.el = el('.measure.mb3',
      this.label = el('label.f6.b.mb2.black-50', {'for': 'Rating'}, 'Rating'),
      this.input = el('input#Rating.input-reset.bn.pa2.mb2.black-50', {name: 'Rating', type: 'text', readonly: true})
    );

    this.update();
  }

  reset () {
    setStyle(this.label, {color: 'transparent'});
    this.input.value = '';
  }

  update (data) {
    if (data) {
      setStyle(this.label, {color: undefined});
      this.input.value = data.rating;
    } else {
      setStyle(this.label, {color: 'transparent'});
      this.input.value = '';
    }

    this.form.updateEventInputs({rating: this.input.value});
  }
}

class SinglesInput {
  constructor (initData) {
    this.form = initData.form;

    this.el = el('.flex.items-center.mb2',
      this.input = el('input.mr1', {id: initData.id, name: initData.id, type: 'checkbox'}),
      this.label = el('label', {'for': initData.id}, initData.label),
      this.hint = el('span.f6.black-60.db.ml2', initData.hint)
    );

    this.input.oninput = e => this.onInput(e);
  }

  onInput (e) {
    this.form.updateCost();
    this.form.updateSubmitInput();
  }
}

class DoublesInput {
  constructor (initData) {
    this.form = initData.form;

    this.el = el('.flex.items-center.mv2',
      this.input = el('input.mr1', {id: initData.id, name: initData.id, type: 'checkbox'}),
      this.label = el('label', {'for': initData.id}, initData.label),
      this.partner = new PartnerNameInput({id: initData.id + 'Partner'})
    );

    this.input.oninput = e => this.onInput(e);
  }

  onInput (e) {
    this.partner.update(this.input.checked);
    this.form.updateCost();
    this.form.updateSubmitInput();
  }
}

class PartnerNameInput {
  constructor (initData) {
    this.el = el('span',
      this.label = el('label.mr1', {'for': initData.id}, ', partner name'),
      this.input = el('input.input-reset.ba', {id: initData.id, name: initData.id})
    );

    this.update(false);
  }

  update (visible) {
    if (visible) {
      setStyle(this.label, {color: ''});
      setStyle(this.input, {color: ''});
      this.input.classList.add('b--black-20');
      this.input.classList.remove('bg-transparent', 'b--transparent');
      setAttr(this.input, {'disabled': '', placeholder: 'Last name, First name'});
    } else {
      setStyle(this.label, {color: 'transparent'});
      setStyle(this.input, {color: 'transparent'});
      this.input.classList.add('bg-transparent', 'b--transparent');
      this.input.classList.remove('b--black-20');
      setAttr(this.input, {'disabled': 'disabled', placeholder: ''});
    }
  }
}
