/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// v1.2c test with new JPZ XML etc
// watch test

/**
 * Test to make sure we can access functions in the Library.
 */
function testlib() {
	const res = AppLib.test()
	Logger.log(res);
}

function onInstall(e) {
	onOpen(e);
}

/** 
 * Adds the menu item on open. 
 */
function onOpen(e) {
	DocumentApp.getUi()
		.createMenu('Puzzle')
		.addItem('Upload .jpz', 'uploadStarter')
		.addItem('Download as .jpz', 'downloadStarter')
		.addToUi();
}

// ----------------------------------------------------------------------------
// UPLOAD 
// ----------------------------------------------------------------------------

/**
 * Returns an HTML dialog with a file input to upload a .puz.
 */
function uploadStarter() {
	const html = HtmlService.createHtmlOutputFromFile('upload')
		.setWidth(300)
		.setHeight(200);
	DocumentApp.getUi().showModalDialog(html, 'Upload .jpz');
}

/**
 * Decodes and processes a .puz file into a templated doc.
 * 
 * @param {*} base64data 
 */
async function processUploadFile(base64data) {
	try {
		const raw = base64data.replace(/^data.*?base64,/, '');
		const dataBlob = Utilities.newBlob(Utilities.base64Decode(raw));
		
		let dataString = dataBlob.getDataAsString();
		// not really a better way to tell if the file is compressed or not with 
		// only the built-in GAS tools.
    if (!/crossword-compiler-applet/.test(dataString)) {
      dataBlob.setContentType('application/zip');
      dataString = Utilities.unzip(dataBlob)[0].getDataAsString();
    }
		
		const [ meta, grid, clues ] = await AppLib.getPuzNew(dataString);
		
    const style = {
			[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT,
			[DocumentApp.Attribute.FONT_FAMILY]: 'Source Code Pro',
			[DocumentApp.Attribute.FONT_SIZE]: 10.5,
			[DocumentApp.Attribute.INDENT_FIRST_LINE]: 0,
			[DocumentApp.Attribute.INDENT_START]: 144,
			[DocumentApp.Attribute.LINE_SPACING]: 1.15,
			[DocumentApp.Attribute.SPACING_AFTER]: 10
		};

		const body = DocumentApp.getActiveDocument().getBody();
		body.clear();

		addParagraphs(meta, body, style, {
			[DocumentApp.Attribute.SPACING_AFTER]: 0
		});
		
		addParagraphs('', body, style);
		
		addParagraphs(grid, body, style, {
			[DocumentApp.Attribute.LINE_SPACING]: 1.00,
			[DocumentApp.Attribute.SPACING_AFTER]: 0
		});
		
		addParagraphs('', body, style);
		addParagraphs(clues, body, style);

	} catch (e) {
    console.error(e);
		throw new Error ('Unable to upload. The .jpz file may be invalid.')
	}
	Logger.log('processed!')
  return true;
}

function addParagraphs(text, body, style, overrides = {}) {
	for (const p of text.split('\n')) {
		body.appendParagraph(p)
			.setAttributes({
				...style,
				...overrides
			})
	}
}

// ----------------------------------------------------------------------------
// DOWNLOAD 
// ----------------------------------------------------------------------------

/**
 * Returns an HTML dialog with a file input to upload a .puz.
 */
function downloadStarter() {
	const html = HtmlService.createTemplateFromFile('jpzDialog')
		.evaluate()
		.setWidth(300)
		.setHeight(150);
	DocumentApp.getUi().showModalDialog(html, 'Download');
}

/**
 * creates a jpz file (XML, but base-64 encoded for ease of download.)
 */
 function createJpz() {
	try {
		const activeDoc = DocumentApp.getActiveDocument();
    const jpzXml = makeJpzFromDoc(activeDoc);
		const jpzB64 = Utilities.base64Encode(jpzXml, Utilities.Charset.UTF_8);
		const docName = activeDoc.getName();
		return {
			filename: `${docName.replace(/ /gi, '_')}.jpz`,
			data: jpzB64
		};
	} catch (e) {
    console.error(e);
		throw new Error ('Couldn\'t make a .jpz file. Check document formatting and try again.')
	}
}

function makeJpzFromDoc(activeDoc) {
  const bodyPs = activeDoc.getBody().getParagraphs();
  const ps = bodyPs.filter(p => p.getText().trim());
  const pTexts = ps.map(p => p.getText());
  const title  = pTexts[0].trim();
  const creator = pTexts[1].trim();

  const gridPs = [];
	const cluePs = [];

  const REGEXPS = {
    // eslint-disable-next-line no-useless-escape
    GRID: /^[A-Z]( [│ ] [A-Z\.])+$/,
    GRID_BARS: /^[ ─][ ┼┤├┴┬┘└┐┌─│╵╷╴╶]+$/,
    CLUE: /^(\d+)([AD])\t[A-Z]{3,}\t(.*)$/
  };

	for (let i=2; i<ps.length; i++) {
		if (REGEXPS.GRID.test(pTexts[i]) || REGEXPS.GRID_BARS.test(pTexts[i])) {
			gridPs.push(pTexts[i].trimEnd());
		} else if (REGEXPS.CLUE.test(pTexts[i])) {
			cluePs.push(REGEXPS.CLUE.exec(processItals(ps[i])));
		} else {
			continue;
		}
	}

  console.log(`number of clues: ${cluePs.length}`)

  const xml = AppLib.makeJpz({ meta: {title, creator}, gridPs, cluePs });
  return xml;
}

/**
 * For each paragraph, add {{{i}}} tags around italics (later converted to 
 * <i> tags in the XML.)
 * 
 * @param {*} para 
 */
function processItals(para) {
	const textElem = para.editAsText();
	if (textElem.isItalic() === null) {
		let string = '';
		const text = textElem.getText();
		for (i = 0; i<text.length; i++) {
			if (textElem.isItalic(i)) {
				if (i === 0 || !textElem.isItalic(i-1)) {
					string += '{{{i}}}';
				}
				string += text[i];
				if (i === text.length - 1 || !textElem.isItalic(i+1)) {
					string += '{{{/i}}}'
				}
			} else {
				string += text[i]
			}
		}
		return string;
	} else {
		return textElem.getText();
	}
}
