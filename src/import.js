require("regenerator-runtime/runtime");

const find    = require('lodash.find');
const get     = require('lodash.get');
const range   = require('lodash.range');
const zipWith = require('lodash.zipwith');

// ----------------------------------------------------------------------------
// IMPORT FUNCTIONS 
// ----------------------------------------------------------------------------

/**
 * Formats xml2js conversion result into a string representation of a puzzle.
 * 
 * @param {*} res - xml2js converted XML tree. 
 * @returns 
 */
export function formatResultForDoc(res) {
  const root = get(res, 'crossword-compiler-applet.rectangular-puzzle');
  const meta = get(root, 'metadata');
  const crossword = get(root, 'crossword');
  const grid = get(crossword, 'grid.cell')
  const w = parseInt(get(crossword, 'grid.width'), 10);
  const h = parseInt(get(crossword, 'grid.height'), 10);
  const words = makeSolutionsInWords(get(crossword, 'word'), grid);
  const [acrossClues, downClues] = get(crossword, 'clues');  
  
  // const puzzleString = [
  //   printMeta(meta),
  //   printGrid(grid, w, h),
  //   printClues(acrossClues, words),
  //   printClues(downClues, words),
  // ].join('\n\n');

  const pMeta = printMeta(meta);
  const pGrid = printGrid(grid, w, h);
  const pClues = [
    printClues(acrossClues, words), 
    printClues(downClues, words)
  ].join('\n\n');
  
  // return puzzleString;
  return [ pMeta, pGrid, pClues ]
}

function printMeta({ title, creator }) {
  return `${title}\n${creator}`;
}

/**
 * returns a string with a list of clue addresses, solutions, and clues, 
 * matching clues with solutions based on ID.
 * 
 * Sometimes clue text is in <span> tags, sometimes it's just text.
 * 
 * @param {*} clueSet 
 * @param {*} words 
 * @returns 
 */
function printClues(clueSet, words) {
  // not sure this is a safe way to determine the directional suffix
  const dir = clueSet.title.b[0]
  return clueSet.clue.map(clue => {
    const { solution } = find(words, ['id', clue.word]);
    return `${clue.number}${dir}\t${solution}\t${clue.span || clue['_']}`
  }).join('\n');
}

/**
 * uses the <words> enumerated in JPZ xml, along with the grid, to construct 
 * a list of solution words (by concatenating cells.)
 * 
 * @param {*} words 
 * @param {*} grid 
 * @returns 
 */
function makeSolutionsInWords(words, grid) {
  let wordsClone = [];
  
  // sometimes jpz files use <word id='1' x='1-8' y='1'/>
  if (!words[0].cells) {
    wordsClone = words.map(word => {
      const {x, y} = word;
      let start, end, dir;
      if (/-/.test(x)) {
        [start, end] = x.match(/\d+/g).slice(0,2).map(x => parseInt(x, 10));
        dir = 'x';
      } else {
        [start, end] = y.match(/\d+/g).slice(0,2).map(y => parseInt(y, 10));
        dir = 'y';
      }
      return { 
        ...word,
        cells: range(start, end + 1).map(val => ({x, y, [dir]: val}))
      }
    });
  } else {
    wordsClone = words;
  }

  return wordsClone.map(word => {
    const solution = word.cells
      .map(cell => get(find(grid, cell), 'solution'))
      .join('');
    return ({
      ...word,
      solution
    });
  })
}

/**
 * Makes a string with a plaintext representation of a barred grid.
 * 
 * @param {*} grid 
 * @param {*} w 
 * @param {*} h 
 * @returns - a string
 */
function printGrid(grid, w, h) {
  let rows = [];
  for (let i=1; i < h + 1; i++) {
    let rowString = '';
    for (let j=1; j < w + 1; j++) {
      const cell = find(grid, {x: j, y: i});
      const s = cell.y !== h ? find(grid, {x: cell.x, y: cell.y + 1}) : null;
      const e = cell.x !== w ? find(grid, {x: cell.x + 1, y: cell.y}) : null;
      const se = s && e ? find(grid, {x: cell.x + 1, y: cell.y + 1}) : null;
      const drawnCell = drawBox(cell, s, e, se);
      rowString = addCellToRowString(drawnCell, rowString);
    }
    rows.push(rowString);
  }
  return rows.join('\n');
}

/**
 * Does a two-line concatenation of strings: 
 * foo + biz = foobiz
 * bar   bah   barbah
 * 
 * @param {string} cell 
 * @param {string} string 
 * @returns The new string.
 */
function addCellToRowString(cell, string) {
  return string 
    ? zipWith(string.split('\n'), cell.split('\n'), (a,b) => a + b).join('\n') 
    : cell;
}

/**
 * Draws walls around a cell.
 * 
 * @param {*} cell 
 * @param {*} s 
 * @param {*} e 
 * @param {*} se 
 * @returns - a string, at most 4 chars wide and 2 lines tall.
 */
function drawBox(cell, s, e, se) {
  let boxCell = cell.solution;
  if (e) {
    boxCell += e['left-bar'] ? ' │ ' : '   ';
    if (s) {
      boxCell += s['top-bar'] ? '\n──' : '\n  ';
      boxCell += e['left-bar'] 
        ? s['top-bar']
          ? se['left-bar']
            ? se['top-bar'] ? '┼─' : '┤ '
            : se['top-bar'] ? '┴─' : '┘ '
          : se['left-bar']
            ? se['top-bar'] ? '├─' : '│ '
            : se['top-bar'] ? '└─' : '╵ '
        : s['top-bar']
          ? se['left-bar']
            ? se['top-bar'] ? '┬─' : '┐ '
            : se['top-bar'] ? '──' : '╴ '
          : se['left-bar']
            ? se['top-bar'] ? '┌─' : '╷ '
            : se['top-bar'] ? '╶─' : '  ';
    }
    return boxCell;
  } else {
    if (s) {
      boxCell += s['top-bar'] ? '\n─' : '\n ';
      return boxCell;
    } else {
      return boxCell;
    }
  }
}
