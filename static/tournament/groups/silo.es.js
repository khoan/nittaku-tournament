/**
 * A silo of round robin groups from google sheet.
 */
export default class {
  constructor (yyyymm, url) {
    this.id = yyyymm;
    this.url = url;
    this.fetchedAt = undefined;
    this.data = Promise.resolve([])
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
    const silo = this.id + '.round-robin-groups';
    const now = Date.now();
    ttl || (ttl = 300000); // 5 minutes

    var data = JSON.parse(localStorage.getItem(silo));

    if (data && now < data.fetchedAt + ttl) {
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
   * [
   *   {
   *     name: 'Division 1 Single',
   *     groups: [
   *       {
   *         header: 'Group 1',
   *         data: ['Chao, Jiaming', 'Singh, Jaskeerat', 'Yee, Joshua']
   *       },
   *       {
   *         header: 'Group 2',
   *         data: ['Lum, Nicholas', 'Wang, David', 'Mar, Greg', 'Ghanizadeh, Mehdi']
   *       }
   *
   *     ]
   *   }
   * ]
   */
  parse (blob) {
    var result = [];
    var eventData;

    blob.split('\n').forEach(function (row) {
      var columns = row.split('\t').map(c => c.trim());
      var eventName = columns[0];

      if (columns.every(c => c.length === 0)) { return }

      if (eventName.match(/\bsingles?\b/i)) {
        eventData = {name: eventName};
        result.push(eventData);
      } else if (!('groups' in eventData)) {
        eventData.groups = columns.map(function (header) {
          return {header, data: []};
        });
      } else {
        for (var i=0; i < columns.length; ++i) {
          var playerName = columns[i];
          if (playerName) {
            eventData.groups[i].data.push(playerName);
          }
        }
      }
    });

    return result;
  }
}
