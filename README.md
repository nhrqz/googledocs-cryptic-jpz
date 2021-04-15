# googledocs-cryptic-jpz

Import a barred-grid style `.jpz` crossword file to a Google Doc, and export that Google Doc back to a `.jpz` crossword file.

For non-barred grids (conventional American crosswords), see [`googledocs-puz`](https://github.com/nhrqz/googledocs-puz).

- [How to use](#how-to-use)
- [Google Doc formatting](#google-doc-formatting)
- [Structure](#structure)

---

## How to use

`googledocs-cryptic-jpz` uses [`webpack`](https://webpack.js.org/) to bundle and [`clasp`](https://github.com/google/clasp) for deployment. It is exclusively compatible with the V8 runtime of Google Apps Script. 

To initiate the project on an existing Google Doc:

```sh
npm run init -- <PARENT DOCUMENT ID>
```

To re-initiate the project on a different (existing) Google Doc: 

```sh
npm run reinit -- <PARENT DOCUMENT ID>
```

To re-deploy the GAS project after making changes:

```sh
npm run deploy
```

To create the `dist/` directory without doing a `clasp push`:

```
npm run gas
```

---

## Google Doc formatting

`googledocs-cryptic-jpz` expects the Google Doc to be formatted a particular way (ignoring any empty lines). Uploaded puzzles will be rendered in this format. Here's how the [No. 36 *New Yorker* cryptic puzzle](https://www.newyorker.com/puzzles-and-games-dept/cryptic-crossword/no-36) should look:

```txt
The Cryptic Crossword: No. 36
Patrick Berry

C   D   P   L   A   Y   E   R
  ╷       ╶───╴   ╶───╴      
R │ O   U   T   D   O   N   E
  ╵       ╶───╴   ╶───╴      
A   M   E   R   I   C   A   N
          ╶───┐   ┌───┐   ╷  
T   E   R   M │ E │ B │ C │ T
  ╷   ╷   ┌───┘   ╵   ╵   └──
E │ S │ I │ Q   U   O   T   A
  └───┘   └───────┐   ┌───┐  
S   P   L   I   T │ D │ D │ I
──┐   ╷   ╷   ┌───┘   ╵   ╵  
U │ R │ E │ R │ H   E   I   R
  ╵   └───┘   └───╴          
T   O   M   O   R   R   O   W
      ╶───╴   ╶───╴       ╷  
A   M   E   N   D   E   D │ A
      ╶───╴   ╶───╴       ╵  
H   O   U   S   E   K   E   Y

1A	CDPLAYER	Prepare dry place for electronic device (2,6)
7A	OUTDONE	Beaten 0 to 1, following Unitas’s first touchdown (7)
8A	AMERICAN	U.S. car—I mean, convertible (8)
[...]
21A	HOUSEKEY	Sentimental about handle—it opens the door (8)

1D	CRATES	Traces lost shipping containers (6)
2D	DOMES	Deer flanking west side of mountain peaks (5)
[...]
17D	UTAH	State bridges out ahead (4)
```

`googledocs-cryptic-jpz` assumes the first and second lines of the document are title and author, respectively (both are required). The filename of the output will be the name of the Google Doc, suffixed with `.jpz`.

The grid should use only capital letters, spaces, and box drawing characters (`┼┤├┴┬┘└┐┌─│╵╷╴╶`). Every clue consists of three parts: a clue address, the corresponding answer (again, capitals only), and the clue, all separated with tabs. (I.e., for a *New Yorker*-style 8x10 grid: `^[0-9]+[AD]\t[A-Z]{4,10}\t.*$`)

Any non-grid or non-clue text is ignored.

`.jpz` files are Unicode compatible, and any italicized text in the document will be preserved in the JPZ file.

---

## Structure

### [`src/lib.js`](./src/lib.js)

This is compiled to become the `AppLib` referenced in `index.js`. All code relying on `node_modules` should be in this directory.

### [`index.js`](./index.js)

This file contains only Google Apps Script code, and is not compiled by webpack.
