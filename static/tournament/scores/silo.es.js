export default class {
  constructor (id, sources) {
    this.id = id;
    this.sources = sources;

    this.events = [];
    for (let eventName in sources) {
      let url = sources[eventName];
      if (!url) { continue }

      if (!this.event(eventName)) {
        this.events.push({name: eventName});
      }
    }
  }

  event (name) {
    return this.events.find(e => e.name === name);
  }

  async scores (eventName, drawName) {
    let event = this.event(eventName);
    let draw = event.draws.find(d => d.name === drawName);

    if (draw.matches || draw.rounds) {
      return draw;
    }

    let url = this.sources[eventName];

    return this.fetch(`${event.name}.${draw.name}`, url+`&gid=${draw.id}`).then(blob =>
      this.parse(blob, draw)
    ).then(() => draw);
  }

  async draws (eventName) {
    let url = this.sources[eventName];
    let event = this.event(eventName);

    if (event.draws) {
      return event.draws.map(draw => draw.name);
    }

    return this.fetch(`${event.name}.meta`, url+'&gid=0').then(blob => {
      event.draws = [];

      blob.split('\n').forEach(function (row) {
        let [draw, id] = row.split('\t');

        event.draws.push({
          name: draw.replace('G', 'Group ').replace('KO', 'Knockout')
        , id: id
        });
      });
    }).then(() => event.draws.map(draw => draw.name));
  }

  fetch (silo, url, ttl) {
    const now = Date.now();
    ttl || (ttl = 300000); // 5 minutes

    if (!silo.startsWith(this.id)) {
      silo = `${this.id}.${silo}`;
    }

    var data = JSON.parse(localStorage.getItem(silo));

    if (data && now < data.fetchedAt + ttl) {
      return Promise.resolve(data.blob);
    }

    return fetch(url)
      .then(response => response.text())
      .then(text => {
        data = {fetchedAt: now, blob: text};
        localStorage.setItem(silo, JSON.stringify(data));
        return data.blob;
      });
  }

  // parse group/knockout scores
  parse (blob, draw) {
    let rows = blob.split('\n'), columns;

    const parsePoints = raw => {
      let result;

      if (raw.match(/[0-9]/)) {
        result = parseInt(raw);
        if (isNaN(result)) {
          result = undefined;
        }
      } else {
        result = raw.trim() || undefined;
      }

      return result;
    }

    if (draw.name.startsWith('Group')) {
      let match;
      draw.matches = [];

      rows.forEach(row => {
        //console.log('row', row);

        if (row.trim().length === 0 || row.match(/Player's Name/i)) {
          return;
        }

        if (row.match(/Match/i)) {
          match = {name: undefined, scores: []};
          draw.matches.push(match);

        } else if (match) {
          columns = row.split('\t');

          if (match.name) {
            match.name = `${match.name} vs ${columns[0]}`;
            for (let i=1; i<columns.length; ++i) {
              match.scores[i-1].push(parsePoints(columns[i]));
            }
            
          } else {
            match.name = columns[0];
            for (let i=1; i<columns.length; ++i) {
              match.scores.push([parsePoints(columns[i])]);
            }
          }
        }
      });

    // parse round match scores
    } else {
      let round, match, columns;
      draw.rounds = [];

      rows.forEach(row => {
        //console.log('row', row);

        if (row.trim().length === 0 || row.match(/Player's Name/i)) {
          return;
        }

        if (row.match(/Round|Final/i)) {
          round = {name: row.trim(), matches: []};
          draw.rounds.push(round);

        } else if (row.match(/Match/i)) {
          match = {name: undefined, scores: []};
          round.matches.push(match);

        } else if (match) {
          columns = row.split('\t');

          if (match.name) {
            match.name = `${match.name} vs ${columns[0]}`;
            for (let i=1; i<columns.length; ++i) {
              match.scores[i-1].push(parsePoints(columns[i]));
            }
            
          } else {
            match.name = columns[0];
            for (let i=1; i<columns.length; ++i) {
              match.scores.push([parsePoints(columns[i])]);
            }
          }
        }
      });
    }

    //console.log(draw);
    return draw;
  }
}

/**
    [
      {
        name: 'Division 1 Single',
        draws: [
          {
            id: 105537640, // google sheet gid
            name: 'Group 1',
            matches: [
              {
                name: 'Zagajewski, Mateusz vs Bae, Won',
                scores: [ [11, 9], [11, 9], [9, 11], [7, 11], [12, 10] ]
              },
              {
                name: 'Kiely, Shea vs Fikh, Anthory',
                scores: [ [9, 11], [11, 8], ['retired hurt', ''] ]
              }
            ]
          },
          {
            name: 'Knockout',
            rounds: [
              {
                name: 'Round 32',
                matches: [
                  {
                    name: 'Zagajewski, Mateusz vs Bae, Won',
                    scores: [ [11, 9], [11, 9], [9, 11], [7, 11], [12, 10] ]
                  }
                ]
              },
              {
                name: 'Round 16',
                matches: [
                  {
                    name: 'Zagajewski, Mateusz vs Bae, Won',
                    scores: [ [11, 9], [11, 9], [9, 11], [7, 11], [12, 10] ]
                  }
                ]
              },
              {
                name: 'Quarter Final',
                matches: [
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Division 2 Single',
        draws: [
        ]
      }
    ]
    */
