const fs = require('fs');
const { Chess } = require('chess.js');
const W = require('../walker.js');
let fail = 0;
function check(name, cond, extra) { if (!cond) { fail++; console.log('FAIL', name, extra || ''); } else console.log('ok  ', name); }

// 1. The skeleton files from earlier: one line per chapter, orientation read.
for (const f of ['white_repertoire.pgn', 'black_repertoire.pgn', 'staunton_gambit.pgn']) {
  const ch = W.buildChapters(W.parsePGN(fs.readFileSync(__dirname + '/../examples/' + f, 'utf8')), Chess);
  console.log(f, 'chapters', ch.length, 'lines', ch.reduce((a, c) => a + c.lines.length, 0), 'warnings', ch.reduce((a, c) => a + c.warnings.length, 0));
  check(f + ' no warnings', ch.every(c => !c.warnings.length), JSON.stringify(ch.map(c => c.warnings)));
  check(f + ' every chapter has a line', ch.every(c => c.lines.length === 1));
}

// 2. Nested variations, comments, NAGs, Lichess-style commands, two chapters.
const pgn = `[Event "Vienna"]
[Orientation "white"]

{ chapter note } 1. e4 e5 2. Nc3 { [%cal Gg1f3] Develop. } Nf6 3. f4 $1 (3. g3 d5 4. exd5 Nxd5 5. Bg2 (5. Bc4 Nxc3)) 3... d5 4. fxe5 Nxe4 5. Nf3! *

[Event "Caro"]
[Orientation "black"]

1. e4 c6 2. d4 d5 3. e5 (3. Nc3 dxe4 4. Nxe4 Bf5) 3... Bf5 4. Nf3 e6 5. Be2 1-0
`;
const ch = W.buildChapters(W.parsePGN(pgn), Chess);
check('two chapters', ch.length === 2);
check('vienna has 3 lines', ch[0].lines.length === 3, ch[0].lines.length);
check('vienna note', ch[0].note === 'chapter note', ch[0].note);
check('caro has 2 lines', ch[1].lines.length === 2, ch[1].lines.length);
check('caro orientation black', ch[1].orientation === 'b');
const v = ch[0].lines;
check('main line first, ends with Nf3', v[0].plies[v[0].plies.length - 1].san === 'Nf3', v[0].plies.map(p => p.san).join(' '));
check('comment kept, command stripped', v[0].plies[2].comment === 'Develop.', JSON.stringify(v[0].plies[2].comment));
check('fens length = plies+1', v.every(l => l.fens.length === l.plies.length + 1));
check('line ends on my move is kept (white)', v.some(l => l.plies[l.plies.length - 1].color === 'w'));
check('common prefix of f4 and g3 lines is 4 plies', W.commonPrefix(v[0], v[1]) === 4, W.commonPrefix(v[0], v[1]));
check('sibling variations share 8 plies', W.commonPrefix(v[1], v[2]) === 8, W.commonPrefix(v[1], v[2]));
check('move text', W.moveText(v[2], 3) === '1. e4 e5 2. Nc3', W.moveText(v[2], 3));
check('black first move text', W.moveText(ch[1].lines[0], 2).startsWith('1. e4 c6'));

// 3. Illegal move is reported and cut, not crashing.
const bad = W.buildChapters(W.parsePGN('[Event "x"]\n\n1. e4 e5 2. Qh5 Nc6 3. Qxh8 *'), Chess);
check('illegal flagged', bad[0].warnings.length === 1 && bad[0].lines.length === 1 && bad[0].lines[0].plies.length === 4, JSON.stringify(bad[0].warnings));

// 4. Plain movetext with no headers, castling with zeros.
const plain = W.buildChapters(W.parsePGN('1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.0-0 Nf6 *'), Chess);
check('headerless game', plain.length === 1 && plain[0].lines[0].plies.length === 8, plain[0] && plain[0].lines[0].plies.length);

// 5. Variation at the very first move.
const first = W.buildChapters(W.parsePGN('1. e4 (1. d4 d5) 1... e5 *'), Chess);
check('first-move variation', first[0].lines.length === 2, first[0].lines.length);

console.log(fail ? fail + ' FAILED' : 'ALL PASSED');
process.exit(fail ? 1 : 0);
