/**
 * A silo of entries from google sheet.
 */
export default class Silo {
  constructor (yyyymm, url) {
    this.id = yyyymm;
    this.url = url;
    this.fetchedAt = undefined;
    this.update();
  }

  /**
   * fetch from google sheet url
   * then parse tsv blob into json data
   */
  update (url=this.url) {
    this.data = this.fetch(url)
      .then(blob => this.parse(blob))
      .catch(error => console.log('Fail to update from', url, 'because', error));

    return this.data;
  }

  /**
   * fetch from url when localStorage copy is stale
   */
  fetch (url, ttl) {
    const silo = this.id + '.entry-list';
    const now = Date.now();
    ttl || (ttl = 300000); // 5 minutes

    var data = JSON.parse(localStorage.getItem(silo));

    if (data && now < data.fetchedAt + ttl) {
      this.fetchedAt = data.fetchedAt;
      return Promise.resolve(data.blob);
    }

    return fetch(url)
    .then(response => response.text())
    .then(text => {
      data = {fetchedAt: now, blob: text};
      this.fetchedAt = now;
      localStorage.setItem(silo, JSON.stringify(data));
      return data.blob;
    });
  }

  /**
   * parse tsv
   *
   * {
   *   meta: {
   *     updated_at: "30 March 2021, 9:34:12 pm"
   *   },
   *   headers: {
   *     top: ["Entries", "", "", "Singles", "", "", "", "", "", "Double Partner", "", "", "", "", "", ""],
   *     data: ["Player Name (Surname, Forename)", "Rating Central ID", "Rating (as of 10 May 2019)", "Div. 1", "Div. 2", "Div. 3", "Div. 4", "Div. 5", "Junior", "Div. 1", "Div. 2", "Div. 3", "Div. 4", "Div. 5", "Junior"]
   *   }
   *   data: [
   *     ["Yeung, Alex", 1234, 1500, true, false, false, false, false, false, "Yeung, Maria", "", "", "", "", ""]
   *     ["Yeung, Alex", 1234, 1500, true, false, false, false, false, false, "Yeung, Maria", "", "", "", "", ""],
   *     ["Yeung, Alex", 1234, 1500, true, false, false, false, false, false, "Yeung, Maria", "", "", "", "", ""],
   *     ["Yeung, Alex", 1234, 1500, true, false, false, false, false, false, "Yeung, Maria", "", "", "", "", ""],
   *     ["Yeung, Alex", 1234, 1500, true, false, false, false, false, false, "Yeung, Maria", "", "", "", "", ""],
   *     ["Yeung, Alex", 1234, 1500, true, false, false, false, false, false, "Yeung, Maria", "", "", "", "", ""]
   *   ]
   * }
   */
  parse (blob) {
    var result = {
      meta: {updatedAt: undefined}
    , headers: {}
    , data: []
    };

    var rows = blob.split('\n');

    result.meta.updatedAt = rows.shift();

    rows.forEach(function (row) {
      if (! ('top' in result.headers)) {
        result.headers.top = row.split('\t');
      } else if (! ('data' in result.headers)) {
        result.headers.data = row.split('\t');
      } else {
        result.data.push(row.split('\t'));
      }
    });

    return result;
  }
}
