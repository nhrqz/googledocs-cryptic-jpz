require("regenerator-runtime/runtime");

const he         = require('he');
const chunk      = require('lodash.chunk');
const find       = require('lodash.find');
const sortBy     = require('lodash.sortby');
const takeWhile  = require('lodash.takewhile');
const zip        = require('lodash.zip');
const xmlbuilder = require('xmlbuilder');

// ----------------------------------------------------------------------------
// EXPORT FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Stitches together XML-ready grid, word, and clue objects into an XML-ready 
 * root JPZ document, then builds the document an converts it to a string.
 * 
 * @param {*} param0 
 * @returns 
 */
export function makeJpzXml({meta, gridPs, cluePs}) {
  const grid = makeGridJpz(gridPs);
  const words = makeWordsFromGridJpz(grid);
  const clues = makeCluesJpz(cluePs);

  const xmlObj = {
    'crossword-compiler-applet': {
      'rectangular-puzzle': {
        metadata: {
          title: he.encode(meta.title, {decimal: true}),
          creator: he.encode(meta.creator, {decimal: true})
        },
        crossword: {
          grid, 
          word: [...words.across, ...words.down], 
          clues
        }
      }
    }
  }

  const jpz = xmlbuilder.create(xmlObj, {noDoubleEncoding: true});
  const jpzString = jpz.end();
  return jpzString.replace(/{{{/g, '<').replace(/}}}/g, '>');
}

/**
 * Makes a XML-ready <grid> object from an array of grid-like paragraphs.
 * 
 * @param {string[]} gridArr 
 * @returns 
 */
function makeGridJpz(gridArr) {
	const gridWidth = gridArr[0].length;
	
  const grid = gridArr.map(rowStr => {
    if (rowStr.length < gridWidth) {
      rowStr = rowStr.padEnd(gridWidth);
    }
    return chunk(rowStr.split(''), 2).map(chnk => chnk[0]);
  });

  const w = Math.ceil(grid[0].length / 2);
  const h = Math.ceil(grid.length / 2);

  const cells = makeCells(grid);
  const numberedCells = numberGrid(cells);
  
  return ({
    '@width': w,
    '@height': h,
    '@one-letter-words': 'false',
    'grid-look': { 
      '@numbering-scheme': 'normal',
      '@thick-border': 'true'
    },
    cell: numberedCells
  });
}

/**
 * Makes XML-ready <cell> objects from a 2-d array of grid characters, by 
 * seeking every other row and column and looking for adjoining box-drawing 
 * characters.
 * 
 * @param {string[][]} grid 
 * @returns 
 */
function makeCells(grid) {
  let cells = [];
  for (let i=0; i<grid.length; i+=2) {
    let row = grid[i];
    for (let j=0; j<row.length; j+=2) {
      const cell = row[j];
      const topBar =  i === 0 ? null : grid[i-1][j] === '─';
      const leftBar = j === 0 ? null : grid[i][j-1] === '│';
      const x = Math.floor(j / 2) + 1;
      const y = Math.floor(i / 2) + 1;
      cells.push({
        '@x': x,
        '@y': y,
        '@solution': cell,
        ...(topBar  && {'@top-bar' : true}),
        ...(leftBar && {'@left-bar': true}),
      })
    }
  }
  return cells;
}

/**
 * Construes conventional grid numbering from an array of cells.
 * 
 * @param {Object[]} cells 
 * @returns 
 */
function numberGrid(cells) {
  let counter = 1;
  
  const numberedCells = cells.map(cell => {
    const s = find(cells, {'@x': cell['@x'], '@y': cell['@y'] + 1});
    const e = find(cells, {'@x': cell['@x'] + 1, '@y': cell['@y']});
    const isStartAcr = (cell['@left-bar'] || cell['@x'] === 1) 
      && (e !== undefined && !e['@left-bar']); 
    const isStartDwn = (cell['@top-bar'] || cell['@y'] === 1) 
      && (s !== undefined && !s['@top-bar']);
    if (isStartAcr || isStartDwn) {
      cell = {
        ...cell,
        '@number': counter++
      };
    }
    return cell;
  })

  return numberedCells;
}

/**
 * Makes two sets of XML-ready words from the grid object (destructuring to get 
 * the array of cells and the width.)
 * 
 * @param {*} param0 - the XML-ready grid object, implicitly.
 * @returns 
 */
function makeWordsFromGridJpz({cell: grid, '@width': w}) {
  const rows = chunk(grid, w);
  const cols = zip(...rows);
  
  const acrossWords = collectWords(rows, '@left-bar');
  const downWords = collectWords(cols, '@top-bar');

  const downOffset = acrossWords.length + 1;
  
  return {
    across: sortBy(acrossWords, ["[0]['@number']"])
      .map((word, index) => makeWordsFromCells(word, index, 1)),
    down: sortBy(downWords, ["[0]['@number']"])
      .map((word, index) => makeWordsFromCells(word, index, downOffset))
  }
}

/**
 * Jams together cells to make words, stopping at a property that marks a new 
 * word when true. (E.g., 'left-bar' for across words.) 
 * 
 * @param {*} rowOrColArray 
 * @param {*} stopper 
 * @returns 
 */
function collectWords(rowOrColArray, stopper) {
  const words = [];
  for (let row of rowOrColArray) {
    const rowWords = [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell[stopper] || c === 0) {
        const word = [];
        word.push(cell, ...takeWhile(row.slice(c + 1), o => !o[stopper]));
        rowWords.push(word);
      }
    }
    words.push(...rowWords.filter(w => w.length > 1));
  }
  return words;
}

/**
 * Makes XML-ready <word> objects from an array of cells.
 * 
 * @param {*} cells 
 * @param {*} index 
 * @param {*} offset - the offset to start the ID counting at.
 * @returns 
 */
function makeWordsFromCells(cells, index, offset) {
  return {
    '@id': index + offset,
    cells: cells.map(({'@x': x, '@y': y}) => ({'@x': x, '@y': y}))
  }
}

/**
 * Makes XML-ready <clue> objects from an array of clue-like string arrays.
 * 
 * @param {*} cluePs 
 * @returns 
 */
function makeCluesJpz(cluePs) {
	const clues = {
		across: [],
		down: []
	};
	
  cluePs.forEach((clueP, clueIndex) => {
		const [ , num, dir, clue] = clueP //.trim();
		if (dir === 'A') {
			clues.across.push({
				'@number': num,
				'@word': clueIndex + 1,
				span: he.encode( clue.trim(), {decimal: true} )
			})
		} else if (dir === 'D') {
			clues.down.push({
				'@number': num,
				'@word': clueIndex + 1,
				span: he.encode( clue.trim(), {decimal: true} )
			})
		}
	});

	return [
    {
      title: { b: 'Across' },
      clue: clues.across
    },
    {
      title: { b: 'Down' },
      clue: clues.down
    }
  ];
}
