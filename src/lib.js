require("regenerator-runtime/runtime");

const Parser = require('xml2js').Parser;

import { formatResultForDoc } from "./import";
import { makeJpzXml } from "./export";

// IMPORT

/**
 * Processes JPZ XML (as a string), returns a string representation of the 
 * puzzle.
 * 
 * @param {*} dataString 
 * @returns 
 */
async function getPuzNew(dataString) {
  const parser = new Parser({
    explicitArray: false,
    mergeAttrs: true,
    attrValueProcessors: [
      function(value, name) {
        // regex test in case of condensed-form <word> elements (no children)
        if ((name === 'x' || name === 'y') && /^\d+$/.test(value)) {
          value = parseInt(value, 10);
        }
        return value;
      }
    ]
  });

  return parser.parseStringPromise(dataString)
    .then(res => {
      const print = formatResultForDoc(res);
      return print;
    })
    .catch(e => {
      console.error(e);
    })
}

// EXPORT 

/**
 * Takes an object with three arrays of paragraphs (meta, grid-like, clue-like)
 * and constructs JPZ xml.
 * 
 * @param {*} param0 
 * @returns - an XML file (as a string)
 */
function makeJpz({meta, gridPs, cluePs}) {
  try {
    const jpzXml = makeJpzXml({meta, gridPs, cluePs});
    return jpzXml;
  } catch (e) {
    console.error('makeJpzXml error.')
    console.error(e); 
    throw new Error(e.message);
  }
}

// LIB TEST

const test = () => 'lib is working';

export {
  getPuzNew,
  makeJpz,
  test
};
