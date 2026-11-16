(function (root) {
  'use strict';

  function cleanComment(c) {
    return c.replace(/\[%[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Parse one or more PGN games (Lichess study exports included): headers,
  // comments, NAGs and nested variations become a move tree per game.
  function parsePGN(input) {
    var text = String(input).replace(/\r/g, '');
    var i = 0, n = text.length, games = [];
    var ws = /\s/;
    function skipWs() { while (i < n && ws.test(text[i])) i++; }

    while (i < n) {
      var gameStart = i;
      skipWs();
      if (i >= n) break;
      var g = { headers: {}, root: { san: null, children: [], comment: '', parent: null } };
      var sawHeader = false;
      for (;;) {
        skipWs();
        if (text[i] !== '[') break;
        var m = /^\[\s*([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]/.exec(text.slice(i, i + 4000));
        if (!m) { i++; continue; }
        g.headers[m[1]] = m[2].replace(/\\(.)/g, '$1');
        i += m[0].length;
        sawHeader = true;
      }

      var cur = g.root, last = null, stack = [], ended = false;
      while (i < n && !ended) {
        var c = text[i];
        if (ws.test(c)) { i++; continue; }
        if (c === '{') {
          var j = text.indexOf('}', i);
          if (j < 0) j = n;
          var com = cleanComment(text.slice(i + 1, j));
          i = j + 1;
          if (com) {
            var target = last || g.root;
            target.comment = target.comment ? target.comment + ' ' + com : com;
          }
          continue;
        }
        if (c === ';') {
          var e = text.indexOf('\n', i);
          i = e < 0 ? n : e + 1;
          continue;
        }
        if (c === '(') {
          stack.push({ cur: cur, last: last });
          if (last) cur = last.parent;
          last = null;
          i++;
          continue;
        }
        if (c === ')') {
          var s = stack.pop();
          if (s) { cur = s.cur; last = s.last; }
          i++;
          continue;
        }
        if (c === '$') {
          while (i < n && !ws.test(text[i])) i++;
          continue;
        }
        if (c === '[' && stack.length === 0) break; // next game's headers
        var k = i;
        while (k < n && !/[\s{}();$]/.test(text[k])) k++;
        if (k === i) { i++; continue; }
        var tok = text.slice(i, k);
        i = k;
        if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) {
          if (stack.length === 0) ended = true;
          continue;
        }
        tok = tok.replace(/^\d+\.+/, '').replace(/^\.+/, '');
        if (!tok) continue;
        tok = tok.replace(/[!?]+$/, '').replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O');
        if (!tok || tok === '--' || tok === 'Z0') continue;
        var node = { san: tok, children: [], comment: '', parent: cur };
        cur.children.push(node);
        cur = node;
        last = node;
      }

      if (sawHeader || g.root.children.length) games.push(g);
      if (i === gameStart) i++;
    }
    return games;
  }

  function orientationOf(game) {
    return String(game.headers.Orientation || '').toLowerCase() === 'black' ? 'b' : 'w';
  }

  // Flatten each game (chapter) into every root-to-leaf line, with a FEN for
  // each position so the page never needs to replay moves.
  function buildChapters(games, Chess) {
    return games.map(function (game, idx) {
      var startFenHeader = game.headers.FEN && game.headers.SetUp !== '0' ? game.headers.FEN : null;
      var chess = startFenHeader ? new Chess(startFenHeader) : new Chess();
      var startFen = chess.fen();
      var title = game.headers.Event && game.headers.Event !== '?' ? game.headers.Event : 'Chapter ' + (idx + 1);
      var orientation = orientationOf(game);
      var lines = [], warnings = [];
      var plies = [], fens = [startFen];

      function emit() {
        lines.push({
          chapter: idx,
          chapterTitle: title,
          orientation: orientation,
          startFen: startFen,
          plies: plies.slice(),
          fens: fens.slice(),
          key: title + '|' + plies.map(function (p) { return p.from + p.to; }).join(' ')
        });
      }

      function rec(node) {
        var kids = node.children;
        if (!kids.length) { if (plies.length) emit(); return; }
        var legal = 0;
        kids.forEach(function (kid) {
          var mv = chess.move(kid.san, { sloppy: true });
          if (!mv) {
            warnings.push('Illegal or unreadable move "' + kid.san + '" after ' + (plies.length ? plies.map(function (p) { return p.san; }).join(' ') : 'the start') + '. That branch was cut off there.');
            return;
          }
          legal++;
          plies.push({ san: mv.san, from: mv.from, to: mv.to, color: mv.color, comment: kid.comment });
          fens.push(chess.fen());
          rec(kid);
          plies.pop();
          fens.pop();
          chess.undo();
        });
        if (!legal && plies.length) emit();
      }

      rec(game.root);
      return { index: idx, title: title, orientation: orientation, startFen: startFen, note: game.root.comment, lines: lines, warnings: warnings };
    });
  }

  function commonPrefix(a, b) {
    var n = Math.min(a.plies.length, b.plies.length), c = 0;
    while (c < n && a.plies[c].from === b.plies[c].from && a.plies[c].to === b.plies[c].to) c++;
    return c;
  }

  function moveText(line, k) {
    var f = line.startFen.split(' ');
    var num = parseInt(f[5], 10) || 1;
    var out = [];
    for (var j = 0; j < k; j++) {
      var p = line.plies[j];
      if (p.color === 'w') out.push(num + '. ' + p.san);
      else {
        out.push(j === 0 ? num + '... ' + p.san : p.san);
        num++;
      }
    }
    return out.join(' ');
  }

  root.Walker = { parsePGN: parsePGN, buildChapters: buildChapters, commonPrefix: commonPrefix, moveText: moveText };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Walker;
})(typeof window !== 'undefined' ? window : globalThis);
