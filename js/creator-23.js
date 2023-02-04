//URL Params
var params = new URLSearchParams(window.location.search);
const debugging = params.get('debug') != null;
if (debugging) {
	alert('debugging - 4.0');
	document.querySelectorAll('.debugging').forEach(element => element.classList.remove('hidden'));
}

//To save the server from being overloaded? Maybe?
function fixUri(input) {
	/* --- DISABLED FOR LOCAL VERSION --
	var prefix = 'https://card-conjurer.storage.googleapis.com';//'https://raw.githubusercontent.com/ImKyle4815/cardconjurer/remake';
	if (input.includes(prefix) || input.includes('http') || input.includes('data:image') || window.location.href.includes('localhost')) {
		return input;
	} else {
		return prefix + input; //input.replace('/img/frames', prefix + '/img/frames');
	} */
	return input;
}
function setImageUrl(image, source) {
	image.crossOrigin = 'anonymous';
	image.src = fixUri(source);
}
//card object
var card = {width:1500, height:2100, marginX:0, marginY:0, frames:[], artSource:fixUri('/img/blank.png'), artX:0, artY:0, artZoom:1, artRotate:0, setSymbolSource:fixUri('/img/blank.png'), setSymbolX:0, setSymbolY:0, setSymbolZoom:1, watermarkSource:fixUri('/img/blank.png'), watermarkX:0, watermarkY:0, watermarkZoom:1, watermarkLeft:'none', watermarkRight:'none', watermarkOpacity:0.4, version:'', manaSymbols:[]};
//core images/masks
const black = new Image(); black.crossOrigin = 'anonymous'; black.src = fixUri('/img/black.png');
const blank = new Image(); blank.crossOrigin = 'anonymous'; blank.src = fixUri('/img/blank.png');
const right = new Image(); right.crossOrigin = 'anonymous'; right.src = fixUri('/img/frames/maskRightHalf.png');
const middle = new Image(); middle.crossOrigin = 'anonymous'; middle.src = fixUri('/img/frames/maskMiddleThird.png');
const corner = new Image(); corner.crossOrigin = 'anonymous'; corner.src = fixUri('/img/frames/cornerCutout.png');
//art
art = new Image(); art.crossOrigin = 'anonymous'; art.src = blank.src;
art.onerror = function() {if (!this.src.includes('/img/blank.png')) {this.src = fixUri('/img/blank.png');}}
art.onload = artEdited;
//set symbol
setSymbol = new Image(); setSymbol.crossOrigin = 'anonymous'; setSymbol.src = blank.src;
setSymbol.onerror = function() {
	if (this.src.includes('gatherer.wizards.com')) {
		notify('<a target="_blank" href="http' + this.src.split('http')[2] + '">Loading the set symbol from Gatherer failed. Please check this link to see if it exists. If it does, it may be necessary to manually download and upload the image.</a>', 5);
	}
	if (!this.src.includes('/img/blank.png')) {this.src = fixUri('/img/blank.png');}
}
setSymbol.onload = setSymbolEdited;
//watermark
watermark = new Image(); watermark.crossOrigin = 'anonymous'; watermark.src = blank.src;
watermark.onerror = function() {if (!this.src.includes('/img/blank.png')) {this.src = fixUri('/img/blank.png');}}
watermark.onload = watermarkEdited;
//preview canvas
var previewCanvas = document.querySelector('#previewCanvas');
var previewContext = previewCanvas.getContext('2d');
var canvasList = [];
//frame/mask picker stuff
var availableFrames = [];
var selectedFrame = null;
var selectedFrameIndex = 0;
var selectedMaskIndex = 0;
var selectedTextIndex = 0;
var replacementMasks = {};
var customCount = 0;
var lastFrameClick = null;
var lastMaskClick = null;
//for imports
var scryfallArt;
var scryfallCard;
//for text
var drawTextBetweenFrames = false;
var redrawFrames = false;
var savedTextXPosition = 0;
var savedRollYPosition = null;
var savedFont = null;
var savedTextContents = {};
//for misc
var date = new Date();
card.infoYear = date.getFullYear();
document.querySelector("#info-year").value = card.infoYear;
//to avoid rerunning special scripts (planeswalker, saga, etc...)
var loadedVersions = [];
//Card Object managament
async function resetCardIrregularities({canvas = [1500, 2100, 0, 0], resetOthers = true} = {}) {
	//misc details
	card.margins = false;
	replacementMasks = {};
	//rotation
	if (card.landscape) {
		// previewContext.scale(card.width/card.height, card.height/card.width);
		// previewContext.rotate(Math.PI / 2);
		// previewContext.translate(0, -card.width / 2);
		previewContext.setTransform(1, 0, 0, 1, 0, 0);
		card.landscape = false;
	}
	//card size
	card.width = canvas[0];
	card.height = canvas[1];
	card.marginX = canvas[2];
	card.marginY = canvas[3];
	//canvases
	canvasList.forEach(name => {
		if (window[name + 'Canvas'].width != card.width * (1 + card.marginX) || window[name + 'Canvas'].height != card.height * (1 + card.marginY)) {
			sizeCanvas(name);
		}
	});
	if (resetOthers) {
		//bottom info
		await loadBottomInfo({
			midLeft: {text:'{elemidinfo-set}*{elemidinfo-language}  {savex}{fontbelerenbsc}{fontsize' + scaleHeight(0.001) + '}{upinline' + scaleHeight(0.0005) + '}\uFFEE{elemidinfo-artist}', x:0.0647, y:0.9548, width:0.8707, height:0.0171, oneLine:true, font:'gothammedium', size:0.0171, color:'white', outlineWidth:0.003},
			topLeft: {text:'{elemidinfo-number}  {loadx}{elemidinfo-rarity}', x:0.0647, y:0.9377, width:0.8707, height:0.0171, oneLine:true, font:'gothammedium', size:0.0171, color:'white', outlineWidth:0.003},
			bottomLeft: {text:'NOT FOR SALE', x:0.0647, y:0.9719, width:0.8707, height:0.0143, oneLine:true, font:'gothammedium', size:0.0143, color:'white', outlineWidth:0.003},
			wizards: {name:'wizards', text:'{ptshift0,0.0172}\u2122 & \u00a9 {elemidinfo-year} Wizards of the Coast', x:0.0647, y:0.9377, width:0.8707, height:0.0167, oneLine:true, font:'mplantin', size:0.0162, color:'white', align:'right', outlineWidth:0.003},
			bottomRight: {text:'{ptshift0,0.0172}CardConjurer.com', x:0.0647, y:0.9548, width:0.8707, height:0.0143, oneLine:true, font:'mplantin', size:0.0143, color:'white', align:'right', outlineWidth:0.003}
		});
		//onload
		card.onload = null;
	}
}
//Canvas management
function sizeCanvas(name, width = Math.round(card.width * (1 + 2 * card.marginX)), height = Math.round(card.height * (1 + 2 * card.marginY))) {
	if (!window[name + 'Canvas']) {
		window[name + 'Canvas'] = document.createElement('canvas');
		window[name + 'Context'] = window[name + 'Canvas'].getContext('2d');
		canvasList[canvasList.length] = name;
	}
	window[name + 'Canvas'].width = width;
	window[name + 'Canvas'].height = height;
	if (name == 'line') { //force true to view all canvases - must restore to name == 'line' for proper kerning adjustments
		window[name + 'Canvas'].style = 'width: 20rem; height: 28rem; border: 1px solid red;';
		const label = document.createElement('div');
		label.innerHTML = name + '<br>If you can see this and don\'t want to, please clear your cache.';
		label.appendChild(window[name + 'Canvas']);
		label.classList = 'fake-hidden'; //Comment this out to view canvases
		document.body.appendChild(label);
	}
}
//create main canvases
sizeCanvas('card');
sizeCanvas('frame');
sizeCanvas('frameMasking');
sizeCanvas('frameCompositing');
sizeCanvas('text');
sizeCanvas('paragraph');
sizeCanvas('line');
sizeCanvas('watermark');
sizeCanvas('bottomInfo');
sizeCanvas('guidelines');
sizeCanvas('prePT');
//Scaling
function scaleX(input) {
	return Math.round((input + card.marginX) * card.width);
}
function scaleWidth(input) {
	return Math.round(input * card.width);
}
function scaleY(input) {
	return Math.round((input + card.marginY) * card.height);
}
function scaleHeight(input) {
	return Math.round(input * card.height);
}
//Other nifty functions
function getElementIndex(element) {
	return Array.prototype.indexOf.call(element.parentElement.children, element);
}
function getCardName() {
	if (card.text == undefined || card.text.title == undefined) {
		return 'unnamed';
	}
	var imageName = card.text.title.text || 'unnamed';
	if (card.text.nickname) {
		imageName += ' (' + card.text.nickname.text + ')';
	}
	return imageName.replace(/\{[^}]+\}/g, '');
}
//UI
function toggleCreatorTabs(event, target) {
	Array.from(document.querySelector('#creator-menu-sections').children).forEach(element => element.classList.add('hidden'));
	document.querySelector('#creator-menu-' + target).classList.remove('hidden');
	selectSelectable(event);
}
function selectSelectable(event) {
	var eventTarget = event.target.closest('.selectable');
	Array.from(eventTarget.parentElement.children).forEach(element => element.classList.remove('selected'));
	eventTarget.classList.add('selected');
}
function dragStart(event) {
	Array.from(document.querySelectorAll('.dragging')).forEach(element => element.classList.remove('dragging'));
	event.target.closest('.draggable').classList.add('dragging');
}
function dragEnd(event) {
	Array.from(document.querySelectorAll('.dragging')).forEach(element => element.classList.remove('dragging'));
}
function touchMove(event) {
	if (event.target.nodeName != 'H4') {
		event.preventDefault();
	}
	var clientX = event.touches[0].clientX;
	var clientY = event.touches[0].clientY;
	Array.from(document.querySelector('.dragging').parentElement.children).forEach(element => {
		var elementBounds = element.getBoundingClientRect();
		if (clientY > elementBounds.top && clientY < elementBounds.bottom) {
			dragOver(element, false);
		}
	})
}
function dragOver(event, drag=true) {
	var eventTarget;
	if (drag) {
		eventTarget = event.target.closest('.draggable');
	} else {
		eventTarget = event;
	}
	var movingElement = document.querySelector('.dragging');
	if (document.querySelector('.dragging') && !eventTarget.classList.contains('dragging') && eventTarget.parentElement == movingElement.parentElement) {
		var parentElement = eventTarget.parentElement;
		var elements = document.createDocumentFragment();
		var movingElementPassed = false;
		var movingElementOldIndex = -1;
		var movingElementNewIndex = -1;
		Array.from(parentElement.children).forEach((element, index) => {
			if (element == eventTarget) {
				movingElementNewIndex = index;
				if(movingElementPassed) {
					elements.appendChild(element.cloneNode(true));
					elements.appendChild(movingElement.cloneNode(true));
				} else {
					elements.appendChild(movingElement.cloneNode(true));
					elements.appendChild(element.cloneNode(true));
				}
			} else if(element != movingElement) {
				elements.appendChild(element.cloneNode(true));
			} else {
				movingElementOldIndex = index;
				movingElementPassed = true;
			}
		});
		Array.from(elements.children).forEach(element => {
			element.ondragstart = dragStart;
			element.ontouchstart = dragStart;
			element.ondragend = dragEnd;
			element.ontouchend = dragEnd;
			element.ondragover = dragOver;
			element.ontouchmove = touchMove;
			element.onclick = frameElementClicked;
			element.children[3].onclick = removeFrame;
		})
		parentElement.innerHTML = null;
		parentElement.appendChild(elements);
		if (movingElementNewIndex >= 0) {
			var originalMovingElement = card.frames[movingElementOldIndex];
			card.frames.splice(movingElementOldIndex, 1);
			card.frames.splice(movingElementNewIndex, 0, originalMovingElement);
			drawFrames();
		}
	}
}
//Set Symbols
const setSymbolAliases = new Map([
	["anb", "ana"],
	["tsb", "tsp"],
	["pmei", "sld"],
]);
//Mana Symbols
const mana = new Map();
// var manaSymbols = [];
loadManaSymbols(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
				 'w', 'u', 'b', 'r', 'g', 'c', 'x', 'y', 'z', 't', 'untap', 'e', 's', 'oldtap', 'originaltap', 'purple', "a", "inf"]);
loadManaSymbols(['wu', 'wb', 'ub', 'ur', 'br', 'bg', 'rg', 'rw', 'gw', 'gu', '2w', '2u', '2b', '2r', '2g', 'wp', 'up', 'bp', 'rp', 'gp', 'p',
				 'wup', 'wbp', 'ubp', 'urp', 'brp', 'bgp', 'rgp', 'rwp', 'gwp', 'gup', 'purplew', 'purpleu', 'purpleb', 'purpler', 'purpleg', 
				 '2purple', 'purplep'], [1.2, 1.2]);
loadManaSymbols(['bar.png', 'whitebar.png']);
loadManaSymbols(['chaos'], [1.2, 1]);
loadManaSymbols(['tk'], [0.8, 1]);
loadManaSymbols(['planeswalker'], [0.6, 1.2]);
loadManaSymbols(['+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9', '+0'], [1.6, 1]);
function loadManaSymbols(manaSymbolPaths, size = [1, 1]) {
	manaSymbolPaths.forEach(item => {
		var manaSymbol = {};
		if (typeof item == 'string') {
			manaSymbol.name = item.split('.')[0];
			manaSymbol.path = item;
		} else {
			manaSymbol.name = item[0].split('.')[0];
			manaSymbol.path = item[0];
		}
		if (manaSymbol.name.includes('/')) {
			manaSymbol.name = manaSymbol.name.split('/');
			manaSymbol.name = manaSymbol.name[manaSymbol.name.length - 1];
		}
		if (typeof item != 'string') {
			manaSymbol.back = item[1];
			manaSymbol.backs = item[2];
			for (var i = 0; i < item[2]; i ++) {
				loadManaSymbols([manaSymbol.path.replace(manaSymbol.name, 'back' + i + item[1])])
			}
		}
		manaSymbol.width = size[0];
		manaSymbol.height = size[1];
		manaSymbol.image = new Image();
		manaSymbol.image.crossOrigin = 'anonymous';
		var manaSymbolPath = '/img/manaSymbols/' + manaSymbol.path;
		if (!manaSymbolPath.includes('.png')) {
			manaSymbolPath += '.svg';
		}
		manaSymbol.image.src = fixUri(manaSymbolPath);
		mana.set(manaSymbol.name, manaSymbol);
		// manaSymbols.push(manaSymbol);
	});
}
function findManaSymbolIndex(string) {
	return mana.get(key) || -1;
}
function getManaSymbol(key) {
	return mana.get(key);
}
//FRAME TAB
function drawFrames() {
	frameContext.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
	var frameToDraw = card.frames.slice().reverse();
	var haveDrawnPrePTCanvas = false;
	frameToDraw.forEach(item => {
		if (item.image) {
			if (!haveDrawnPrePTCanvas && drawTextBetweenFrames && item.name.includes('Power/Toughness')) {
				haveDrawnPrePTCanvas = true;
				frameContext.globalCompositeOperation = 'source-over';
				frameContext.globalAlpha = 1;
				frameContext.drawImage(prePTCanvas, 0, 0, frameCanvas.width, frameCanvas.height);
			}
			frameContext.globalCompositeOperation = item.mode || 'source-over';
			frameContext.globalAlpha = item.opacity / 100 || 1;
			if (item.opacity == 0) {
				frameContext.globalAlpha = 0;
			}
			var bounds = item.bounds || {};
			var ogBounds = item.ogBounds || bounds;
			frameX = Math.round(scaleX(bounds.x || 0));
			frameY = Math.round(scaleY(bounds.y || 0));
			frameWidth = Math.round(scaleWidth(bounds.width || 1));
			frameHeight = Math.round(scaleHeight(bounds.height || 1));
			frameMaskingContext.globalCompositeOperation = 'source-over';
			frameMaskingContext.drawImage(black, 0, 0, frameMaskingCanvas.width, frameMaskingCanvas.height);
			frameMaskingContext.globalCompositeOperation = 'source-in';
			item.masks.forEach(mask => frameMaskingContext.drawImage(mask.image, scaleX((bounds.x || 0) - (ogBounds.x || 0) - ((ogBounds.x || 0) * ((bounds.width || 1) / (ogBounds.width || 1) - 1))), scaleY((bounds.y || 0) - (ogBounds.y || 0) - ((ogBounds.y || 0) * ((bounds.height || 1) / (ogBounds.height || 1) - 1))), scaleWidth((bounds.width || 1) / (ogBounds.width || 1)), scaleHeight((bounds.height || 1) / (ogBounds.height || 1))));
			if (item.preserveAlpha) { //preserves alpha, and blends colors using an alpha that only cares about the mask(s), and the user-set opacity value
				//draw the image onto a separate canvas to view its unaltered state
				frameCompositingContext.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
				frameCompositingContext.drawImage(item.image, frameX, frameY, frameWidth, frameHeight);
				//create pixel arrays for the existing image, new image, and alpha mask
				var existingData = frameContext.getImageData(0, 0, frameCanvas.width, frameCanvas.height)
				var existingPixels = existingData.data;
				var newPixels = frameCompositingContext.getImageData(0, 0, frameCanvas.width, frameCanvas.height).data;
				var maskPixels = frameMaskingContext.getImageData(0, 0, frameCanvas.width, frameCanvas.height).data;
				const functionalAlphaMultiplier = frameContext.globalAlpha / 255;
				//manually blends colors, basing blending-alpha on the masks and desired draw-opacity, but preserving alpha
				for (var i = 0; i < existingPixels.length; i += 4) {
					const functionalAlpha = maskPixels[i + 3] * functionalAlphaMultiplier //functional alpha = alpha ignoring source image
					if (newPixels[i + 3] > 0) { //Only blend if the new image has alpha
						existingPixels[  i  ] = existingPixels[  i  ] * (1 - functionalAlpha) + newPixels[  i  ] * functionalAlpha; //RED
						existingPixels[i + 1] = existingPixels[i + 1] * (1 - functionalAlpha) + newPixels[i + 1] * functionalAlpha; //GREEN
						existingPixels[i + 2] = existingPixels[i + 2] * (1 - functionalAlpha) + newPixels[i + 2] * functionalAlpha; //BLUE
					}
				}
				frameContext.putImageData(existingData, 0, 0);
			} else {
				//mask the image
				frameMaskingContext.drawImage(item.image, frameX, frameY, frameWidth, frameHeight);
				//color overlay
				if (item.colorOverlayCheck) {frameMaskingContext.globalCompositeOperation = 'source-in'; frameMaskingContext.fillStyle = item.colorOverlay; frameMaskingContext.fillRect(0, 0, frameMaskingCanvas.width, frameMaskingCanvas.height);}
				//HSL adjustments
				if (item.hslHue || item.hslSaturation || item.hslLightness) {
					hsl(frameMaskingCanvas, item.hslHue || 0, item.hslSaturation || 0, item.hslLightness || 0);
				}
				//erase mode
				if (item.erase) {frameContext.globalCompositeOperation = 'destination-out';}
				frameContext.drawImage(frameMaskingCanvas, 0, 0, frameCanvas.width, frameCanvas.height);
			}
		}
	});
	if (!haveDrawnPrePTCanvas && drawTextBetweenFrames) {
		haveDrawnPrePTCanvas = true;
		frameContext.globalCompositeOperation = 'source-over';
		frameContext.globalAlpha = 1;
		frameContext.drawImage(prePTCanvas, 0, 0, frameCanvas.width, frameCanvas.height);
	}
	drawCard();
}
function loadFramePacks(framePackOptions = []) {
	document.querySelector('#selectFramePack').innerHTML = null;
	framePackOptions.forEach(item => {
		var framePackOption = document.createElement('option');
		framePackOption.innerHTML = item.name;
		if (item.value == 'disabled') {
			framePackOption.disabled = true;
		} else {
			framePackOption.value = item.value;
		}
		document.querySelector('#selectFramePack').appendChild(framePackOption);
	});
	loadScript("/js/frames/pack" + document.querySelector('#selectFramePack').value + ".js");
}
function loadFramePack(frameOptions = availableFrames) {
	resetDoubleClick();
	document.querySelector('#frame-picker').innerHTML = null;
	frameOptions.forEach(item => {
		var frameOption = document.createElement('div');
		frameOption.classList = 'frame-option hidden';
		frameOption.onclick = frameOptionClicked;
		var frameOptionImage = document.createElement('img');
		frameOption.appendChild(frameOptionImage);
		frameOptionImage.onload = function() {
			this.parentElement.classList.remove('hidden');
		}
		if (!item.noThumb && !item.src.includes('/img/black.png')) {
			frameOptionImage.src = fixUri(item.src.replace('.png', 'Thumb.png').replace('.svg', 'Thumb.png'));
		} else {
			frameOptionImage.src = fixUri(item.src);
		}
		document.querySelector('#frame-picker').appendChild(frameOption);

	})
	document.querySelector('#mask-picker').innerHTML = '';
	document.querySelector('#frame-picker').children[0].click();
	if (localStorage.getItem('autoLoadFrameVersion') == 'true') {
		document.querySelector('#loadFrameVersion').click();
	}
}
function autoLoadFrameVersion() {
	localStorage.setItem('autoLoadFrameVersion', document.querySelector('#autoLoadFrameVersion').checked);
}
function frameOptionClicked(event) {
	const button = doubleClick(event, 'frame');
	const clickedFrameOption = event.target.closest('.frame-option');
	const newFrameIndex = getElementIndex(clickedFrameOption);
	if (newFrameIndex != selectedFrameIndex || document.querySelector('#mask-picker').innerHTML == '') {
		resetDoubleClick();
		Array.from(document.querySelectorAll('.frame-option.selected')).forEach(element => element.classList.remove('selected'));
		clickedFrameOption.classList.add('selected');
		selectedFrameIndex = newFrameIndex;
		if (!availableFrames[selectedFrameIndex].noDefaultMask) {
			document.querySelector('#mask-picker').innerHTML = '<div class="mask-option" onclick="maskOptionClicked(event)"><img src="' + black.src + '"><p>No Mask</p></div>';
		} else {
			document.querySelector('#mask-picker').innerHTML = '';
		}
		document.querySelector('#selectedPreview').innerHTML = '(Selected: ' + availableFrames[selectedFrameIndex].name + ', No Mask)';
		if (availableFrames[selectedFrameIndex].masks) {
			availableFrames[selectedFrameIndex].masks.forEach(item => {
				const maskOption = document.createElement('div');
				maskOption.classList = 'mask-option hidden';
				maskOption.onclick = maskOptionClicked;
				const maskOptionImage = document.createElement('img');
				maskOption.appendChild(maskOptionImage);
				maskOptionImage.onload = function() {
					this.parentElement.classList.remove('hidden');
				}
				maskOptionImage.src = fixUri(item.src.replace('.png', 'Thumb.png').replace('.svg', 'Thumb.png'));
				const maskOptionLabel = document.createElement('p');
				maskOptionLabel.innerHTML = item.name;
				maskOption.appendChild(maskOptionLabel);
				document.querySelector('#mask-picker').appendChild(maskOption);
			});
		}
		const firstChild = document.querySelector('#mask-picker').firstChild;
		firstChild.classList.add('selected');
		firstChild.click();
	} else if (button) { button.click(); resetDoubleClick(); }
}
function maskOptionClicked(event) {
	var button = doubleClick(event, 'mask');
	const clickedMaskOption = event.target.closest('.mask-option');
	(document.querySelector('.mask-option.selected').classList || document.querySelector('body').classList).remove('selected');
	clickedMaskOption.classList.add('selected');
	const newMaskIndex = getElementIndex(clickedMaskOption)
	if (newMaskIndex != selectedMaskIndex) { button = null; }
	selectedMaskIndex = newMaskIndex;
	var selectedMaskName = 'No Mask'
	if (selectedMaskIndex > 0) {selectedMaskName = availableFrames[selectedFrameIndex].masks[selectedMaskIndex - 1].name;}
	document.querySelector('#selectedPreview').innerHTML = '(Selected: ' + availableFrames[selectedFrameIndex].name + ', ' + selectedMaskName + ')';
	if (button) { button.click(); resetDoubleClick(); }
}
function resetDoubleClick() {
	lastFrameClick, lastMaskClick = null, null;
}
function doubleClick(event, maskOrFrame) {
	const currentClick = (new Date()).getTime();
	var lastClick = null;
	if (maskOrFrame == 'mask') {
		lastClick = lastMaskClick;
		lastMaskClick = currentClick;
	} else {
		lastClick = lastFrameClick + 0;
		lastFrameClick = currentClick + 0;
	}
	if (lastClick && lastClick + 500 > currentClick) {
		var buttonID = null;
		if (event.shiftKey) {
			buttonID = '#addToRightHalf';
		} else if (event.ctrlKey) {
			buttonID = '#addToLeftHalf';
		} else if (event.altKey) {
			buttonID = '#addToMiddleThird';
		} else {
			buttonID = '#addToFull';
		}
		return document.querySelector(buttonID);
	}
	return null;
}
async function addFrame(additionalMasks = [], loadingFrame = false) {
	var frameToAdd = JSON.parse(JSON.stringify(availableFrames[selectedFrameIndex]));
	var maskThumbnail = true;
	if (!loadingFrame) {
		// The frame is being added manually by the user, so we must process which mask(s) they have selected
		var noDefaultMask = 0;
		if (frameToAdd.noDefaultMask) {noDefaultMask = 1;}
		if (frameToAdd.masks && selectedMaskIndex + noDefaultMask > 0) {
			frameToAdd.masks = frameToAdd.masks.slice(selectedMaskIndex - 1 + noDefaultMask, selectedMaskIndex + noDefaultMask);
		} else {
		 	frameToAdd.masks = [];
		 	maskThumbnail = false;
		}
		additionalMasks.forEach(item => {
			if (item.name in replacementMasks) {
				item.src = replacementMasks[item.name];
			}
			frameToAdd.masks.push(item);
		});
		// Likewise, we now add any complementary frames
		if ('complementary' in frameToAdd && frameToAdd.masks.length == 0) {
			if (typeof frameToAdd.complementary == 'number') {
				frameToAdd.complementary = [frameToAdd.complementary];
			}
			const realFrameIndex = selectedFrameIndex;
			for (const index of frameToAdd.complementary) {
				selectedFrameIndex = index;
				await addFrame();
			}
			selectedFrameIndex = realFrameIndex;
		}
	} else {
		frameToAdd = loadingFrame;
		if (frameToAdd.masks.length == 0 || (frameToAdd.masks[0].src.includes('/img/frames/mask'))) {
			maskThumbnail = false;
		}
	}
	frameToAdd.masks.forEach(item => {
		item.image = new Image();
		item.image.crossOrigin = 'anonymous';
		item.image.src = blank.src;
		item.image.onload = drawFrames;
		item.image.src = fixUri(item.src);
	});
	frameToAdd.image = new Image();
	frameToAdd.image.crossOrigin = 'anonymous'
	frameToAdd.image.src = blank.src;
	frameToAdd.image.onload = drawFrames;
	if ('stretch' in frameToAdd) {
		stretchSVG(frameToAdd);
	} else {
		frameToAdd.image.src = fixUri(frameToAdd.src);
	}
	if (!loadingFrame) {
		card.frames.unshift(frameToAdd);
	}
	var frameElement = document.createElement('div');
	frameElement.classList = 'draggable frame-element';
	frameElement.draggable = 'true';
	frameElement.ondragstart = dragStart;
	frameElement.ondragend = dragEnd;
	frameElement.ondragover = dragOver;
	frameElement.ontouchstart = dragStart;
	frameElement.ontouchend = dragEnd;
	frameElement.ontouchmove = touchMove;
	frameElement.onclick = frameElementClicked;
	var frameElementImage = document.createElement('img');
	if (frameToAdd.noThumb || frameToAdd.src.includes('/img/black.png')) {
		frameElementImage.src = fixUri(frameToAdd.src);
	} else {
		frameElementImage.src = fixUri(frameToAdd.src.replace('.png', 'Thumb.png'));
	}
	frameElement.appendChild(frameElementImage);
	var frameElementMask = document.createElement('img');
	if (maskThumbnail) {
		frameElementMask.src = fixUri(frameToAdd.masks[0].src.replace('.png', 'Thumb.png'));
	} else {
		frameElementMask.src = black.src;
	}
	frameElement.appendChild(frameElementMask);
	var frameElementLabel = document.createElement('h4');
	frameElementLabel.innerHTML = frameToAdd.name;
	frameToAdd.masks.forEach(item => frameElementLabel.innerHTML += ', ' + item.name);
	frameElement.appendChild(frameElementLabel);
	var frameElementClose = document.createElement('h4');
	frameElementClose.innerHTML = 'X';
	frameElementClose.classList = 'frame-element-close';
	frameElementClose.onclick = removeFrame;
	frameElement.appendChild(frameElementClose);
	document.querySelector('#frame-list').prepend(frameElement);
	bottomInfoEdited();
}
function removeFrame(event) {
	card.frames.splice(getElementIndex(event.target.parentElement), 1);
	event.target.parentElement.remove();
	drawFrames();
	bottomInfoEdited();
}
function frameElementClicked(event) {
	if (!event.target.classList.contains('frame-element-close')) {
		var selectedFrameElement = event.target.closest('.frame-element');
		selectedFrame = card.frames[Array.from(selectedFrameElement.parentElement.children).indexOf(selectedFrameElement)];
		document.querySelector('#frame-element-editor').classList.add('opened');
		selectedFrame.bounds = selectedFrame.bounds || {};
		if (selectedFrame.ogBounds == undefined) {
			selectedFrame.ogBounds = JSON.parse(JSON.stringify(selectedFrame.bounds));
		}
		// Basic manipulations
		document.querySelector('#frame-editor-x').value = scaleWidth(selectedFrame.bounds.x || 0);
		document.querySelector('#frame-editor-x').onchange = (event) => {selectedFrame.bounds.x = (event.target.value / card.width); drawFrames();}
		document.querySelector('#frame-editor-y').value = scaleHeight(selectedFrame.bounds.y || 0);
		document.querySelector('#frame-editor-y').onchange = (event) => {selectedFrame.bounds.y = (event.target.value / card.height); drawFrames();}
		document.querySelector('#frame-editor-width').value = scaleWidth(selectedFrame.bounds.width || 1);
		document.querySelector('#frame-editor-width').onchange = (event) => {selectedFrame.bounds.width = (event.target.value / card.width); drawFrames();}
		document.querySelector('#frame-editor-height').value = scaleHeight(selectedFrame.bounds.height || 1);
		document.querySelector('#frame-editor-height').onchange = (event) => {selectedFrame.bounds.height = (event.target.value / card.height); drawFrames();}
		document.querySelector('#frame-editor-opacity').value = selectedFrame.opacity || 100;
		document.querySelector('#frame-editor-opacity').onchange = (event) => {selectedFrame.opacity = event.target.value; drawFrames();}
		document.querySelector('#frame-editor-erase').checked = selectedFrame.erase || false;
		document.querySelector('#frame-editor-erase').onchange = (event) => {selectedFrame.erase = event.target.checked; drawFrames();}
		document.querySelector('#frame-editor-alpha').checked = selectedFrame.preserveAlpha || false;
		document.querySelector('#frame-editor-alpha').onchange = (event) => {selectedFrame.preserveAlpha = event.target.checked; drawFrames();}
		document.querySelector('#frame-editor-color-overlay-check').checked = selectedFrame.colorOverlayCheck || false;
		document.querySelector('#frame-editor-color-overlay-check').onchange = (event) => {selectedFrame.colorOverlayCheck = event.target.checked; drawFrames();}
		document.querySelector('#frame-editor-color-overlay').value = selectedFrame.colorOverlay || false;
		document.querySelector('#frame-editor-color-overlay').onchange = (event) => {selectedFrame.colorOverlay = event.target.value; drawFrames();}
		document.querySelector('#frame-editor-hsl-hue').value = selectedFrame.hslHue || 0;
		document.querySelector('#frame-editor-hsl-hue-slider').value = selectedFrame.hslHue || 0;
		document.querySelector('#frame-editor-hsl-hue').onchange = (event) => {selectedFrame.hslHue = event.target.value; drawFrames();}
		document.querySelector('#frame-editor-hsl-hue-slider').onchange = (event) => {selectedFrame.hslHue = event.target.value; drawFrames();}
		document.querySelector('#frame-editor-hsl-saturation').value = selectedFrame.hslSaturation || 0;
		document.querySelector('#frame-editor-hsl-saturation-slider').value = selectedFrame.hslSaturation || 0;
		document.querySelector('#frame-editor-hsl-saturation').onchange = (event) => {selectedFrame.hslSaturation = event.target.value; drawFrames();}
		document.querySelector('#frame-editor-hsl-saturation-slider').onchange = (event) => {selectedFrame.hslSaturation = event.target.value; drawFrames();}
		document.querySelector('#frame-editor-hsl-lightness').value = selectedFrame.hslLightness || 0;
		document.querySelector('#frame-editor-hsl-lightness-slider').value = selectedFrame.hslLightness || 0;
		document.querySelector('#frame-editor-hsl-lightness').onchange = (event) => {selectedFrame.hslLightness = event.target.value; drawFrames();}
		document.querySelector('#frame-editor-hsl-lightness-slider').onchange = (event) => {selectedFrame.hslLightness = event.target.value; drawFrames();}
		// Removing masks
		const selectMaskElement = document.querySelector('#frame-editor-masks');
		selectMaskElement.innerHTML = null;
		const maskOptionNone = document.createElement('option');
		maskOptionNone.disabled = true;
		maskOptionNone.innerHTML = 'None Selected';
		selectMaskElement.appendChild(maskOptionNone);
		selectedFrame.masks.forEach(mask => {
			const maskOption = document.createElement('option');
			maskOption.innerHTML = mask.name;
			selectMaskElement.appendChild(maskOption);
		});
		selectMaskElement.selectedIndex = 0;
	}
}
function frameElementMaskRemoved() {
	const selectElement = document.querySelector('#frame-editor-masks');
	const selectedOption = selectElement.value;
	if (selectedOption != 'None Selected') {
		selectElement.remove(selectElement.selectedIndex);
		selectElement.selectedIndex = 0;
		selectedFrame.masks.forEach(mask => {
			if (mask.name == selectedOption) {
				selectedFrame.masks = selectedFrame.masks.filter(item => item.name != selectedOption);
				drawFrames();
			}
		});
	}
}
function uploadMaskOption(imageSource) {
	const uploadedMask = {name:`Uploaded Image (${customCount})`, src:imageSource, noThumb:true, image: new Image()};
	customCount ++;
	selectedFrame.masks.push(uploadedMask);
	uploadedMask.image.onload = drawFrames;
	uploadedMask.image.src = imageSource;
}
function uploadFrameOption(imageSource) {
	const uploadedFrame = {name:`Uploaded Image (${customCount})`, src:imageSource, noThumb:true};
	customCount ++;
	availableFrames.push(uploadedFrame);
	loadFramePack();
}
function hsl(canvas, inputH, inputS, inputL) {
	//adjust inputs
	var hue = parseInt(inputH) / 360;
	var saturation = parseInt(inputS) / 100;
	var lightness = parseInt(inputL) / 100;
	//create needed objects
	var context = canvas.getContext('2d')
	var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	var pixels = imageData.data;
	//for every pixel...
	for (var i = 0; i < pixels.length; i += 4) {
		//grab rgb
		var r = pixels[i];
		var g = pixels[i + 1];
		var b = pixels[i + 2];
		//convert to hsl
		var res = rgbToHSL(r, g, b);
		h = res[0];
		s = res[1];
		l = res[2];
		//make adjustments
		h += hue;
		while (h > 1) {h --;}
		s = Math.min(Math.max(s + saturation, 0), 1);
		l = Math.min(Math.max(l + lightness, 0), 1);
		//convert back to rgb
		res = hslToRGB(h, s, l);
		r = res[0];
		g = res[1];
		b = res[2];
		//and reassign
		pixels[i] = r;
		pixels[i + 1] = g;
		pixels[i + 2] = b;
	}
	//then put the new image data back
	context.putImageData(imageData, 0, 0);
}
function croppedCanvas(oldCanvas, sensitivity = 0) {
	var oldContext = oldCanvas.getContext('2d');
	var newCanvas = document.createElement('canvas');
	var newContext = newCanvas.getContext('2d');
	var pixels = oldContext.getImageData(0, 0, oldCanvas.width, oldCanvas.height).data;
	var pixX = [];
	var pixY = [];
	for (var x = 0; x < oldCanvas.width; x += 1) {
		for (var y = 0; y < oldCanvas.height; y += 1) {
			if (pixels[(y * oldCanvas.width + x) * 4 + 3] > sensitivity) {
				pixX.push(x);
				pixY.push(y);
			}
		}
	}
	pixX.sort(function(a, b) { return a - b });
	pixY.sort(function(a, b) { return a - b });
	var n = pixX.length - 1;
	var newWidth = 1 + pixX[n] - pixX[0];
	var newHeight = 1 + pixY[n] - pixY[0];
	newCanvas.width = newWidth;
	newCanvas.height = newHeight;
	newContext.putImageData(oldCanvas.getContext('2d').getImageData(pixX[0], pixY[0], newWidth, newHeight), 0, 0);
	return newCanvas;
}
/*
shoutout to https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion for providing the hsl-rgb conversion algorithms
*/
function rgbToHSL(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}
function hslToRGB(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
//TEXT TAB
var writingText;
function loadTextOptions(textObject, replace=true) {
	var oldCardText = card.text || {};
	Object.entries(oldCardText).forEach(item => {
		savedTextContents[item[0]] = oldCardText[item[0]].text;
	});
	if (replace) {
		card.text = textObject;
	} else {
		Object.keys(textObject).forEach(key => {
			card.text[key] = textObject[key];
		});
	}
	document.querySelector('#text-options').innerHTML = null;
	Object.entries(card.text).forEach(item => {
		if (oldCardText[item[0]]) {
			card.text[item[0]].text = oldCardText[item[0]].text;
		} else if (savedTextContents[item[0]]) {
			card.text[item[0]].text = savedTextContents[item[0]];
		}
		var textOptionElement = document.createElement('h4');
		textOptionElement.innerHTML = item[1].name;
		textOptionElement.classList = 'selectable text-option'
		textOptionElement.onclick = textOptionClicked;
		document.querySelector('#text-options').appendChild(textOptionElement);
	});
	document.querySelector('#text-options').firstChild.click();
	drawTextBuffer();
	drawNewGuidelines();
}
function textOptionClicked(event) {
	selectedTextIndex = getElementIndex(event.target);
	document.querySelector('#text-editor').value = Object.entries(card.text)[selectedTextIndex][1].text;
	selectSelectable(event);
}
function textboxEditor() {
	var selectedTextbox = card.text[Object.keys(card.text)[selectedTextIndex]];
	document.querySelector('#textbox-editor').classList.add('opened');
	document.querySelector('#textbox-editor-x').value = scaleWidth(selectedTextbox.x || 0);
	document.querySelector('#textbox-editor-x').onchange = (event) => {selectedTextbox.x = (event.target.value / card.width); textEdited();}
	document.querySelector('#textbox-editor-y').value = scaleHeight(selectedTextbox.y || 0);
	document.querySelector('#textbox-editor-y').onchange = (event) => {selectedTextbox.y = (event.target.value / card.height); textEdited();}
	document.querySelector('#textbox-editor-width').value = scaleWidth(selectedTextbox.width || 1);
	document.querySelector('#textbox-editor-width').onchange = (event) => {selectedTextbox.width = (event.target.value / card.width); textEdited();}
	document.querySelector('#textbox-editor-height').value = scaleHeight(selectedTextbox.height || 1);
	document.querySelector('#textbox-editor-height').onchange = (event) => {selectedTextbox.height = (event.target.value / card.height); textEdited();}
}
function textEdited() {
	card.text[Object.keys(card.text)[selectedTextIndex]].text = curlyQuotes(document.querySelector('#text-editor').value);
	drawTextBuffer();
}
function drawTextBuffer() {
	clearTimeout(writingText);
	writingText = setTimeout(drawText, 500);
}
async function drawText() {
	textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);
	prePTContext.clearRect(0, 0, prePTCanvas.width, prePTCanvas.height);
	drawTextBetweenFrames = false;
	for (var textObject of Object.entries(card.text)) {
		await writeText(textObject[1], textContext);
		continue;
	}
	if (drawTextBetweenFrames || redrawFrames) {
		drawFrames();
		if (!drawTextBetweenFrames) {
			redrawFrames = false;
		}
	} else {
		drawCard();
	}
}
function writeText(textObject, targetContext) {
	//Most bits of info about text loaded, with defaults when needed
	var textX = scaleX(textObject.x) || scaleX(0);
	var textY = scaleY(textObject.y) || scaleY(0);
	var textWidth = scaleWidth(textObject.width) || scaleWidth(1);
	var textHeight = scaleHeight(textObject.height) || scaleHeight(1);
	var startingTextSize = scaleHeight(textObject.size) || scaleHeight(0.038);
	var textFontHeightRatio = 0.7;
	var textBounded = textObject.bounded || true;
	var textOneLine = textObject.oneLine || false;
	var textManaCost = textObject.manaCost || false;
	var textManaSpacing = scaleWidth(textObject.manaSpacing) || 0;
	//Buffers the canvases accordingly
	var canvasMargin = 300;
	paragraphCanvas.width = textWidth + 2 * canvasMargin;
	paragraphCanvas.height = textHeight + 2 * canvasMargin;
	lineCanvas.width = textWidth + 2 * canvasMargin;
	lineCanvas.height = startingTextSize + 2 * canvasMargin;
	//Preps the text string
	var splitString = '6GJt7eL8';
	var rawText = textObject.text
	if ((textObject.name == 'wizards' || textObject.name == 'copyright') && params.get('copyright') != null && (params.get('copyright') != '' || card.margins)) {
		rawText = params.get('copyright'); //so people using CC for custom card games without WotC's IP can customize their copyright info
		if (rawText == 'none') { rawText = ''; }
	}
	if (rawText.toLowerCase().includes('{cardname}') || rawText.toLowerCase().includes('~')) {
		rawText = rawText.replace(/{cardname}|~/ig, getCardName());
	}
	if (document.querySelector('#info-artist').value == '') {
		rawText = rawText.replace('\uFFEE{elemidinfo-artist}', '');
	}
	var splitText = rawText.replace(/\n/g, '{line}').replace(/{-}/g, '\u2014').replace(/{divider}/g, '{lns}{bar}{lns}{fixtextalign}').replace(/{flavor}/g, '{lns}{bar}{lns}{fixtextalign}{i}').replace(/{/g, splitString + '{').replace(/}/g, '}' + splitString).replace(/ /g, splitString + ' ' + splitString).split(splitString);
	splitText = splitText.filter(item => item);
	if (textObject.vertical) {
		newSplitText = [];
		splitText.forEach(item => {
			if (item.includes('{') && item.includes('}')) {
				newSplitText.push(item);
			} else if (item == ' ') {
				newSplitText.push(`{down${scaleHeight(0.01)}}`);
			} else {
				item.split('').forEach(char => {
					if (char == '’') {
						newSplitText.push(`{right${startingTextSize * 0.6}}`, '’', '{lns}', `{up${startingTextSize * 0.75}}`);
					} else {
						newSplitText.push(char, '{lns}');
					}
				});
				// newSplitText = newSplitText.concat(item.split(''));
			}
		});
		splitText = newSplitText;
	}
	// if (textManaCost && textObject.arcStart > 0) {
	// 	splitText.reverse();
	// }
	if (textObject.manaCost) {
		splitText = splitText.filter(item => item != ' ');
	}
	splitText.push('');
	//Manages the redraw loop
	var drawingText = true;
	//Repeatedly tries to draw the text at smaller and smaller sizes until it fits
	outerloop: while (drawingText) {
		//Rest of the text info loaded that may have been changed by a previous attempt at drawing the text
		var textColor = textObject.color || 'black';
		var textFont = textObject.font || 'mplantin';
		var textAlign = textObject.align || 'left';
		var textJustify = textObject.justify || 'left';
		var textShadowColor = textObject.shadow || 'black';
		var textShadowOffsetX = scaleWidth(textObject.shadowX) || 0;
		var textShadowOffsetY = scaleHeight(textObject.shadowY) || 0;
		var textShadowBlur = scaleHeight(textObject.shadowBlur) || 0;
		var textArcRadius = scaleHeight(textObject.arcRadius) || 0;
		var manaSymbolColor = textObject.manaSymbolColor || null;
		var textRotation = textObject.rotation || 0;
		if (textArcRadius > 0) {
			//Buffers the canvases accordingly
			var canvasMargin = 300 + textArcRadius;
			paragraphCanvas.width = textWidth + 2 * canvasMargin;
			paragraphCanvas.height = textHeight + 2 * canvasMargin;
			lineCanvas.width = textWidth + 2 * canvasMargin;
			lineCanvas.height = startingTextSize + 2 * canvasMargin;
		}
		var textArcStart = textObject.arcStart || 0;
		//Variables for tracking text position/size/font
		var currentX = 0;
		var startingCurrentX = 0;
		var currentY = 0;
		var lineY = 0;
		var newLine = false;
		var textFontExtension = '';
		var textFontStyle = textObject.fontStyle || '';
		var manaPlacementCounter = 0;
		var realTextAlign = textAlign;
		savedRollYPosition = null;
		var savedRollColor = 'black';
		var drawToPrePTCanvas = false;
		var widestLineWidth = 0;
		//variables that track various... things?
		var textSize = startingTextSize;
		var newLineSpacing = (textObject.lineSpacing || 0) * textSize;
		var ptShift = [0, 0];
		var permaShift = [0, 0];
		//Finish prepping canvases
		paragraphContext.clearRect(0, 0, paragraphCanvas.width, paragraphCanvas.height);
		lineContext.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
		lineCanvas.style.letterSpacing = (scaleWidth(textObject.kerning) || 0) + 'px';
		// if (textFont == 'goudymedieval') {
		// 	lineCanvas.style.letterSpacing = '3.5px';
		// }
		lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
		lineContext.fillStyle = textColor;
		lineContext.shadowColor = textShadowColor;
		lineContext.shadowOffsetX = textShadowOffsetX;
		lineContext.shadowOffsetY = textShadowOffsetY;
		lineContext.shadowBlur = textShadowBlur;
		lineContext.strokeStyle = textObject.outlineColor || 'black';
		var textOutlineWidth = scaleHeight(textObject.outlineWidth) || 0;
		lineContext.lineWidth = textOutlineWidth;
		//Begin looping through words/codes
		innerloop: for (word of splitText) {
			var wordToWrite = word;
			if (wordToWrite.includes('{') && wordToWrite.includes('}') || textManaCost || savedFont) {
				var possibleCode = wordToWrite.toLowerCase().replace('{', '').replace('}', '');
				wordToWrite = null;
				if (possibleCode == 'line') {
					newLine = true;
					startingCurrentX = 0;
					newLineSpacing = textSize * 0.35;
				} else if (possibleCode == 'lns' || possibleCode == 'linenospace') {
					newLine = true;
				} else if (possibleCode == 'bar') {
					var barWidth = textWidth * 0.95;
					var barHeight = scaleHeight(0.002);
					var barImageName = 'bar';
					var barDistance = 0.45;
					realTextAlign = textAlign;
					textAlign = 'left';
					if (textColor == 'white') {
						barImageName = 'whitebar';
					}
					if (card.version == 'cartoony') {
						barImageName = 'cflavor';
						barWidth = scaleWidth(0.8547);
						barHeight = scaleHeight(0.0458);
						barDistance = -0.23;
						newLineSpacing = textSize * -0.23;
						textSize -= scaleHeight(0.0086);
					}
					lineContext.drawImage(getManaSymbol(barImageName).image, canvasMargin + (textWidth - barWidth) / 2, canvasMargin + barDistance * textSize, barWidth, barHeight);
				} else if (possibleCode == 'i') {
					if (textFont == 'mplantin') {
						textFontExtension = 'i';
						textFontStyle = textFontStyle.replace('italic ', '');
					} else {
						textFontExtension = '';
						if (!textFontStyle.includes('italic')) {textFontStyle += 'italic ';}
					}
					lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
				} else if (possibleCode == '/i') {
					textFontExtension = '';
					textFontStyle = textFontStyle.replace('italic ', '');
					lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
				} else if (possibleCode == 'bold') {
					if (!textFontStyle.includes('bold')) {textFontStyle += 'bold ';}
					lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
				} else if (possibleCode == '/bold') {
					textFontStyle = textFontStyle.replace('bold ', '');
					lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
				} else if (possibleCode == 'left') {
					textAlign = 'left';
				} else if (possibleCode == 'center') {
					textAlign = 'center';
				} else if (possibleCode == 'right') {
					textAlign = 'right';
				} else if (possibleCode == 'justify-left') {
					textJustify = 'left';
				} else if (possibleCode == 'justify-center') {
					textJustify = 'center';
				} else if (possibleCode == 'justify-right') {
					textJustify = 'right';
				} else if (possibleCode.includes('conditionalcolor')) {
					var codeParams = possibleCode.split(":");
					for (var eligibleFrame of codeParams[1].split(",")) {
						eligibleFrame = eligibleFrame.replace(/_/g, " ");
						if (card.frames.findIndex(element => element.name.toLowerCase().includes(eligibleFrame)) != -1) {
							textColor = codeParams[2];
							lineContext.fillStyle = textColor;
						}
					}
				} else if (possibleCode.includes('fontcolor')) {
					textColor = possibleCode.replace('fontcolor', '');
					lineContext.fillStyle = textColor;
				} else if (possibleCode.includes('fontsize')) {
					if (possibleCode.slice(-2) === "pt") {
						textSize = (parseInt(possibleCode.replace('fontsize', '').replace('pt', '')) * 600 / 72) || 0;
					} else {
						textSize += parseInt(possibleCode.replace('fontsize', '')) || 0;
					}
					lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
				} else if (possibleCode.includes('font') || savedFont) {
					textFont = word.replace('{font', '').replace('}', '');
					if (savedFont) {
						textFont = savedFont;
						wordToWrite = word;
					}
					textFontExtension = '';
					textFontStyle = '';
					lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
					savedFont = null;
				} else if (possibleCode.includes('outlinecolor')) {
					lineContext.strokeStyle = possibleCode.replace('outlinecolor', '');
				} else if (possibleCode.includes('outline')) {
					textOutlineWidth = parseInt(possibleCode.replace('outline', ''));
					lineContext.lineWidth = textOutlineWidth;
				} else if (possibleCode.includes('upinline')) {
					lineY -= parseInt(possibleCode.replace('upinline', '')) || 0;
				} else if (possibleCode.substring(0, 2) == 'up' && possibleCode != 'up') {
					currentY -= parseInt(possibleCode.replace('up', '')) || 0;
				} else if (possibleCode.includes('down')) {
					currentY += parseInt(possibleCode.replace('down', '')) || 0;
				} else if (possibleCode.includes('left')) {
					currentX -= parseInt(possibleCode.replace('left', '')) || 0;
				} else if (possibleCode.includes('right')) {
					currentX += parseInt(possibleCode.replace('right', '')) || 0;
				} else if (possibleCode.includes('shadow')) {
					if (possibleCode.includes('color')) {
						textShadowColor = possibleCode.replace('shadowcolor', '');
						lineContext.shadowColor = textShadowColor;
					} else if (possibleCode.includes('blur')) {
						textShadowBlur = parseInt(possibleCode.replace('shadowblur', '')) || 0;
						lineContext.shadowBlur = textShadowBlur
					} else if (possibleCode.includes('shadowx')) {
						textShadowOffsetX = parseInt(possibleCode.replace('shadowx', '')) || 0;
						lineContext.shadowOffsetX = textShadowOffsetX;
					} else if (possibleCode.includes('shadowy')) {
						textShadowOffsetY = parseInt(possibleCode.replace('shadowy', '')) || 0;
						lineContext.shadowOffsetY = textShadowOffsetY;
					} else {
						textShadowOffsetX = parseInt(possibleCode.replace('shadow', '')) || 0;
						textShadowOffsetY = textShadowOffsetX;
						lineContext.shadowOffsetX = textShadowOffsetX;
						lineContext.shadowOffsetY = textShadowOffsetY;
					}
				} else if (possibleCode == 'planechase') {
					var planechaseHeight = textSize * 1.8;
					lineContext.drawImage(getManaSymbol('chaos').image, currentX + canvasMargin, canvasMargin, planechaseHeight * 1.2, planechaseHeight);
					currentX += planechaseHeight * 1.3;
					startingCurrentX += planechaseHeight * 1.3;
				} else if (possibleCode == 'indent') {
					startingCurrentX += currentX;
				} else if (possibleCode == '/indent') {
					startingCurrentX = 0;
				} else if (possibleCode.includes('elemid')) {
					if (document.querySelector('#' + word.replace('{elemid', '').replace('}', ''))) {
						wordToWrite = document.querySelector('#' + word.replace('{elemid', '').replace('}', '')).value || '';
					}
				} else if (possibleCode == 'savex') {
					savedTextXPosition = currentX;
				} else if (possibleCode == 'loadx') {
					if (savedTextXPosition > currentX) {
						currentX = savedTextXPosition;
					}
				} else if (possibleCode.includes('ptshift')) {
					if (card.frames.findIndex(element => element.name.toLowerCase().includes('power/toughness')) >= 0 || card.version.includes('planeswalker') || ['commanderLegends', 'm21', 'mysticalArchive', 'customDualLands', 'feuerAmeiseKaldheim'].includes(card.version)) {
						ptShift[0] = scaleWidth(parseFloat(possibleCode.replace('ptshift', '').split(',')[0]));
						ptShift[1] = scaleHeight(parseFloat(possibleCode.split(',')[1]));
					}
				} else if (possibleCode.includes('rollcolor')) {
					savedRollColor = possibleCode.replace('rollcolor', '') || 'black';
				} else if (possibleCode.includes('roll')) {
					drawTextBetweenFrames = true;
					redrawFrames = true;
					drawToPrePTCanvas = true;
					if (savedRollYPosition == null) {
						savedRollYPosition = currentY;
					} else {
						savedRollYPosition = -1;
					}
					savedFont = textFont;
					lineContext.font = textFontStyle + textSize + 'px ' + 'belerenb' + textFontExtension;
					wordToWrite = possibleCode.replace('roll', '');
				} else if (possibleCode.includes('permashift')) {
					permaShift = [parseFloat(possibleCode.replace('permashift', '').split(',')[0]), parseFloat(possibleCode.split(',')[1])];
				} else if (possibleCode.includes('arcradius')) {
					textArcRadius = parseInt(possibleCode.replace('arcradius', '')) || 0;
				} else if (possibleCode.includes('arcstart')) {
					textArcStart = parseFloat(possibleCode.replace('arcstart', '')) || 0;
				} else if (possibleCode.includes('rotate')) {
					textRotation = parseInt(possibleCode.replace('rotate', '')) % 360;
				} else if (possibleCode === 'manacolordefault') {
					manaSymbolColor = null;
				} else if (possibleCode.includes('manacolor')) {
					manaSymbolColor = possibleCode.replace('manacolor', '') || 'white';
				} else if (possibleCode.includes('fixtextalign')) {
					textAlign = realTextAlign;
				} else if (possibleCode.includes('kerning')) {
					lineCanvas.style.letterSpacing = possibleCode.replace('kerning', '') + 'px';
					lineContext.font = lineContext.font; //necessary for the letterspacing update to be recognized
				} else if (getManaSymbol(possibleCode.replace('/', '')) != undefined || getManaSymbol(possibleCode.replace('/', '').split('').reverse().join('')) != undefined) {
					possibleCode = possibleCode.replace('/', '')
					var manaSymbol;
					if (textObject.manaPrefix && (getManaSymbol(textObject.manaPrefix + possibleCode) != undefined || getManaSymbol(textObject.manaPrefix + possibleCode.split('').reverse().join('')) != undefined)) {
						manaSymbol = getManaSymbol(textObject.manaPrefix + possibleCode) || getManaSymbol(textObject.manaPrefix + possibleCode.split('').reverse().join(''));
					} else {
						manaSymbol = getManaSymbol(possibleCode) || getManaSymbol(possibleCode.split('').reverse().join(''));
					}
					var manaSymbolSpacing = textSize * 0.04 + textManaSpacing;
					var manaSymbolWidth = manaSymbol.width * textSize * 0.78;
					var manaSymbolHeight = manaSymbol.height * textSize * 0.78;
					var manaSymbolX = currentX + canvasMargin + manaSymbolSpacing;
					var manaSymbolY = canvasMargin + textSize * 0.34 - manaSymbolHeight / 2;
					if (textObject.manaPlacement) {
						manaSymbolX = scaleWidth(textObject.manaPlacement.x[manaPlacementCounter] || 0) + canvasMargin;
						manaSymbolY = canvasMargin;
						currentY = scaleHeight(textObject.manaPlacement.y[manaPlacementCounter] || 0);
						manaPlacementCounter ++;
						newLine = true;
					} else if (textObject.manaLayout) {
						var layoutOption = 0;
						var manaSymbolCount = splitText.length - 1;
						while (textObject.manaLayout[layoutOption].max < manaSymbolCount && layoutOption < textObject.manaLayout.length - 1) {
							layoutOption ++;
						}
						var manaLayout = textObject.manaLayout[layoutOption];
						if (manaLayout.pos[manaPlacementCounter] == undefined) {
							manaLayout.pos[manaPlacementCounter] = [0, 0];
						}
						manaSymbolX = scaleWidth(manaLayout.pos[manaPlacementCounter][0] || 0) + canvasMargin;
						manaSymbolY = canvasMargin;
						currentY = scaleHeight(manaLayout.pos[manaPlacementCounter][1] || 0);
						manaPlacementCounter ++;
						manaSymbolWidth *= manaLayout.size;
						manaSymbolHeight *= manaLayout.size;
						newLine = true;
					}
					if (textObject.manaImageScale) {
						currentX -= (textObject.manaImageScale - 1) * manaSymbolWidth;
						manaSymbolX -= (textObject.manaImageScale - 1) / 2 * manaSymbolWidth;
						manaSymbolY -= (textObject.manaImageScale - 1) / 2 * manaSymbolHeight;
						manaSymbolWidth *= textObject.manaImageScale;
						manaSymbolHeight *= textObject.manaImageScale;
					}
					//fake shadow begins
					var fakeShadow = lineCanvas.cloneNode();
					var fakeShadowContext = fakeShadow.getContext('2d');
					fakeShadowContext.clearRect(0, 0, fakeShadow.width, fakeShadow.height);
					var backImage = null;
					if (manaSymbol.backs) {
						backImage = getManaSymbol('back' + Math.floor(Math.random() * manaSymbol.backs) + manaSymbol.back).image;
					}
					if (textArcRadius > 0) {
						if (manaSymbol.backs) {
							fakeShadowContext.drawImageArc(backImage, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight, textArcRadius, textArcStart, currentX);
						}
						fakeShadowContext.drawImageArc(manaSymbol.image, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight, textArcRadius, textArcStart, currentX);
					} else if (manaSymbolColor) {
						fakeShadowContext.fillImage(manaSymbol.image, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight, manaSymbolColor);
					} else {
						if (manaSymbol.backs) {
							fakeShadowContext.drawImage(backImage, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight);
						}
						fakeShadowContext.drawImage(manaSymbol.image, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight);
					}
					lineContext.drawImage(fakeShadow, 0, 0);
					//fake shadow ends (thanks, safari)
					currentX += manaSymbolWidth + manaSymbolSpacing * 2;
				} else {
					wordToWrite = word;
				}
			}
			//if the word goes past the max line width, go to the next line
			if (wordToWrite && lineContext.measureText(wordToWrite).width + currentX >= textWidth && textArcRadius == 0) {
				if (textOneLine && startingTextSize > 1) {
					//doesn't fit... try again at a smaller text size?
					startingTextSize -= 1;
					continue outerloop;
				}
				newLine = true;
			}
			//if we need a new line, go to the next line
			if ((newLine && !textOneLine) || splitText.indexOf(word) == splitText.length - 1) {
				var horizontalAdjust = 0
				if (textAlign == 'center') {
					horizontalAdjust = (textWidth - currentX) / 2;
				} else if (textAlign == 'right') {
					horizontalAdjust = textWidth - currentX;
				}
				if (currentX > widestLineWidth) {
					widestLineWidth = currentX;
				}
				paragraphContext.drawImage(lineCanvas, horizontalAdjust, currentY);
				lineY = 0;
				lineContext.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
				// boxes for 'roll a d20' cards
				if (savedRollYPosition != null && (newLineSpacing != 0 || !(newLine && !textOneLine))) {
					if (savedRollYPosition != -1) {
						paragraphContext.globalCompositeOperation = 'destination-over';
						paragraphContext.globalAlpha = 0.25;
						paragraphContext.fillStyle = savedRollColor;
						paragraphContext.fillRect(canvasMargin - textSize * 0.1, savedRollYPosition + canvasMargin - textSize * 0.28, paragraphCanvas.width - 2 * canvasMargin + textSize * 0.2, currentY - savedRollYPosition + textSize * 1.3);
						paragraphContext.globalCompositeOperation = 'source-over';
						paragraphContext.globalAlpha = 1;
						savedRollYPosition = -1;
					} else {
						savedRollYPosition = null;
					}
				}
				//reset
				currentX = startingCurrentX;
				currentY += textSize + newLineSpacing;
				newLineSpacing = (textObject.lineSpacing || 0) * textSize;
				newLine = false;
			}
			//if there's a word to write, it's not a space on a new line, and it's allowed to write words, then we write the word
			if (wordToWrite && (currentX != startingCurrentX || wordToWrite != ' ') && !textManaCost) {
				if (textArcRadius > 0) {
					lineContext.fillTextArc(wordToWrite, currentX + canvasMargin, canvasMargin + textSize * textFontHeightRatio + lineY, textArcRadius, textArcStart, currentX, textOutlineWidth);
				} else {
					if (textOutlineWidth >= 1) {
						lineContext.strokeText(wordToWrite, currentX + canvasMargin, canvasMargin + textSize * textFontHeightRatio + lineY);
					}
					lineContext.fillText(wordToWrite, currentX + canvasMargin, canvasMargin + textSize * textFontHeightRatio + lineY);
				}
				currentX += lineContext.measureText(wordToWrite).width;
			}
			if (currentY > textHeight && textBounded && !textOneLine && startingTextSize > 1 && textArcRadius == 0) {
				//doesn't fit... try again at a smaller text size?
				startingTextSize -= 1;
				continue outerloop;
			}
			if (splitText.indexOf(word) == splitText.length - 1) {
				//should manage vertical centering here
				var verticalAdjust = 0;
				if (!textObject.noVerticalCenter) {
					verticalAdjust = (textHeight - currentY + textSize * 0.15) / 2;
				}
				var finalHorizontalAdjust = 0;
				const horizontalAdjustUnit = (textWidth - widestLineWidth) / 2;
				if (textJustify == 'right' && textAlign != 'right') {
					finalHorizontalAdjust = 2 * horizontalAdjustUnit;
					if (textAlign == 'center') {
						finalHorizontalAdjust = horizontalAdjustUnit;
					}
				} else if (textJustify == 'center' && textAlign != 'center') {
					finalHorizontalAdjust = horizontalAdjustUnit;
					if (textAlign == 'right') {
						finalHorizontalAdjust = - horizontalAdjustUnit;
					}
				}
				var trueTargetContext = targetContext;
				if (drawToPrePTCanvas) {
					trueTargetContext = prePTContext;
				}
				if (textRotation) {
					trueTargetContext.save();
					trueTargetContext
					const shapeX = textX + ptShift[0];
					const shapeY = textY + ptShift[1];
					trueTargetContext.translate(shapeX, shapeY);
					trueTargetContext.rotate(Math.PI * textRotation / 180);
					trueTargetContext.drawImage(paragraphCanvas, permaShift[0] - canvasMargin + finalHorizontalAdjust, verticalAdjust - canvasMargin + permaShift[1]);
					trueTargetContext.restore();
				} else {
					trueTargetContext.drawImage(paragraphCanvas, textX - canvasMargin + ptShift[0] + permaShift[0] + finalHorizontalAdjust, textY - canvasMargin + verticalAdjust + ptShift[1] + permaShift[1]);
				}
				drawingText = false;
			}
		}
	}
}
CanvasRenderingContext2D.prototype.fillTextArc = function(text, x, y, radius, startRotation, distance = 0, outlineWidth = 0) {
	this.save();
	this.translate(x - distance + scaleWidth(0.5), y + radius);
	this.rotate(startRotation + widthToAngle(distance, radius));
	for (var i = 0; i < text.length; i++) {
		var letter = text[i];
		if (outlineWidth >= 1) {
			this.strokeText(letter, 0, -radius);
		}
		this.fillText(letter, 0, -radius);
		this.rotate(widthToAngle(this.measureText(letter).width, radius));
	}
	this.restore();
}
CanvasRenderingContext2D.prototype.drawImageArc = function(image, x, y, width, height, radius, startRotation, distance = 0) {
	this.save();
	this.translate(x - distance + scaleWidth(0.5), y + radius);
	this.rotate(startRotation + widthToAngle(distance, radius));
	this.drawImage(image, 0, -radius, width, height);
	this.restore();
}
CanvasRenderingContext2D.prototype.fillImage = function(image, x, y, width, height, color = 'white', margin = 10) {
	var canvas = document.createElement('canvas');
	canvas.width = width + margin * 2;
	canvas.height = height + margin * 2;
	var context = canvas.getContext('2d');
	context.drawImage(image, margin, margin, width, height);
	context.globalCompositeOperation = 'source-in';
	context.fillStyle = pinlineColors(color);
	context.fillRect(0, 0, width + margin * 2, height + margin * 2);
	this.drawImage(canvas, x - margin, y - margin, width + margin * 2, height + margin * 2);
}
function widthToAngle(width, radius) {
	return width / radius;
}
function curlyQuotes(input) {
	return input.replace(/ '/g, ' ‘').replace(/^'/, '‘').replace(/'/g, '’').replace(/ "/g, ' “').replace(/" /g, '” ').replace(/\."/, '.”').replace(/"$/, '”').replace(/"\)/g, '”)').replace(/"/g, '“');
}
function pinlineColors(color) {
	return color.replace('white', '#fcfeff').replace('blue', '#0075be').replace('black', '#272624').replace('red', '#ef3827').replace('green', '#007b43')
}
async function addTextbox(textboxType) {
	if (textboxType == 'Nickname' && !card.text.nickname && card.text.title) {
		await loadTextOptions({nickname: {name:'Nickname', text:card.text.title.text, x:0.14, y:0.1129, width:0.72, height:0.0243, oneLine:true, font:'mplantini', size:0.0229, color:'white', shadowX:0.0014, shadowY:0.001, align:'center'}}, false);
		var nickname = card.text.title;
		nickname.name = 'Nickname';
		card.text.title = card.text.nickname;
		card.text.title.name = 'Title';
		card.text.nickname = nickname;
	} else if (textboxType == 'Power/Toughness' && !card.text.pt) {
		loadTextOptions({pt: {name:'Power/Toughness', text:'', x:0.7928, y:0.902, width:0.1367, height:0.0372, size:0.0372, font:'belerenbsc', oneLine:true, align:'center'}}, false);
	} else if (textboxType == 'DateStamp' && !card.text.dateStamp) {
		loadTextOptions({dateStamp: {name:'Date Stamp', text:'', x:0.11, y:0.5072, width:0.78, height:0.0286, size:0.0286, font:'belerenb', oneLine:true, align:'right', color:'#ffd35b', shadowX:-0.0007, shadowY:-0.001}}, false);
	}
}
//ART TAB
function uploadArt(imageSource, otherParams) {
	art.src = imageSource;
	if (otherParams && otherParams == 'autoFit') {
		art.onload = function() {
			autoFitArt();
			art.onload = artEdited;
		};
	}
}
function artEdited() {
	card.artSource = art.src;
	card.artX = document.querySelector('#art-x').value / card.width;
	card.artY = document.querySelector('#art-y').value / card.height;
	card.artZoom = document.querySelector('#art-zoom').value / 100;
	card.artRotate = document.querySelector('#art-rotate').value;
	drawCard();
}
function autoFitArt() {
	document.querySelector('#art-rotate').value = 0;
	if (art.width / art.height > scaleWidth(card.artBounds.width) / scaleHeight(card.artBounds.height)) {
		document.querySelector('#art-y').value = Math.round(scaleY(card.artBounds.y) - scaleHeight(card.marginY));
		document.querySelector('#art-zoom').value = (scaleHeight(card.artBounds.height) / art.height * 100).toFixed(1);
		document.querySelector('#art-x').value = Math.round(scaleX(card.artBounds.x) - (document.querySelector('#art-zoom').value / 100 * art.width - scaleWidth(card.artBounds.width)) / 2 - scaleWidth(card.marginX));
	} else {
		document.querySelector('#art-x').value = Math.round(scaleX(card.artBounds.x) - scaleWidth(card.marginX));
		document.querySelector('#art-zoom').value = (scaleWidth(card.artBounds.width) / art.width * 100).toFixed(1);
		document.querySelector('#art-y').value = Math.round(scaleY(card.artBounds.y) - (document.querySelector('#art-zoom').value / 100 * art.height - scaleHeight(card.artBounds.height)) / 2 - scaleHeight(card.marginY));
	}
	artEdited();
}
function artFromScryfall(scryfallResponse) {
	scryfallArt = []
	const artIndex = document.querySelector('#art-index');
	artIndex.innerHTML = null;
	var optionIndex = 0;
	scryfallResponse.forEach(card => {
		if (card.image_uris && (card.object == 'card' || card.type_line != 'Card') && card.artist) {
			scryfallArt.push(card);
			var option = document.createElement('option');
			option.innerHTML = `${card.name} (${card.set.toUpperCase()} - ${card.artist})`;
			option.value = optionIndex;
			artIndex.appendChild(option);
			optionIndex ++;
		}
	});
	changeArtIndex();
}
function changeArtIndex() {
	const artIndexValue = document.querySelector('#art-index').value;
	if (artIndexValue != 0 || artIndexValue == '0') {
		const scryfallCardForArt = scryfallArt[artIndexValue];
		uploadArt(scryfallCardForArt.image_uris.art_crop, 'autoFit');
		artistEdited(scryfallCardForArt.artist);
		if (params.get('mtgpics') != null) {
			imageURL(`https://www.mtgpics.com/pics/art/${scryfallCardForArt.set.toLowerCase()}/${("00" + scryfallCardForArt.collector_number).slice(-3)}.jpg`, tryMTGPicsArt);
		}
	}
}
function tryMTGPicsArt(src) {
	var attemptedImage = new Image();
	attemptedImage.onload = function() {
		if (this.complete) {
			art.onload = function() {
				autoFitArt();
				art.onload = artEdited;
			};
			art.src = this.src;
		}
	}
	attemptedImage.src = src;
}
function initDraggableArt() {
	previewCanvas.onmousedown = artStartDrag;
	previewCanvas.onmousemove = artDrag;
	previewCanvas.onmouseout = artStopDrag;
	previewCanvas.onmouseup = artStopDrag;
	draggingArt = false;
	lastArtDragTime = 0;
}
function artStartDrag(e) {
	e.preventDefault();
	e.stopPropagation();
	startX = parseInt(e.clientX);
	startY = parseInt(e.clientY);
	draggingArt = true;
}
function artDrag(e) {
	e.preventDefault();
	e.stopPropagation();
	if (draggingArt && Date.now() > lastArtDragTime + 25) {
		lastArtDragTime = Date.now();
		if (e.shiftKey || e.ctrlKey) {
			startX = parseInt(e.clientX);
			const endY = parseInt(e.clientY);
			if (e.ctrlKey) {
				document.querySelector('#art-rotate').value = Math.round((parseFloat(document.querySelector('#art-rotate').value) - (startY - endY) / 10) % 360 * 10) / 10;
			} else {
				document.querySelector('#art-zoom').value = Math.round((parseFloat(document.querySelector('#art-zoom').value) * (1.002 ** (startY - endY))) * 10) / 10;
			}
			startY = endY;
			artEdited();
		} else {
			const endX = parseInt(e.clientX);
			const endY = parseInt(e.clientY);
			var changeX = (endX - startX) * 2;
			var changeY = (endY - startY) * 2;
			if (card.landscape) {
				const temp = changeX;
				changeX = -changeY;
				changeY = temp;
			}
			document.querySelector('#art-x').value = parseInt(document.querySelector('#art-x').value) + changeX;
			document.querySelector('#art-y').value = parseInt(document.querySelector('#art-y').value) + changeY;
			startX = endX;
			startY = endY;
			artEdited();
		}
		
	}
}
function artStopDrag(e) {
	e.preventDefault();
	e.stopPropagation();
	if (draggingArt) {
		draggingArt = false;
	}
}
//SET SYMBOL TAB
function uploadSetSymbol(imageSource, otherParams) {
	setSymbol.src = imageSource;
	if (otherParams && otherParams == 'resetSetSymbol') {
		setSymbol.onload = function() {
			resetSetSymbol();
			setSymbol.onload = setSymbolEdited;
		};
	}
}
function setSymbolEdited() {
	card.setSymbolSource = setSymbol.src;
	if (document.querySelector('#lockSetSymbolURL').checked) {
		localStorage.setItem('lockSetSymbolURL', card.setSymbolSource);
	}
	card.setSymbolX = document.querySelector('#setSymbol-x').value / card.width;
	card.setSymbolY = document.querySelector('#setSymbol-y').value / card.height;
	card.setSymbolZoom = document.querySelector('#setSymbol-zoom').value / 100;
	drawCard();
}
function resetSetSymbol() {
	if (card.setSymbolBounds == undefined) {
		return;
	}
	document.querySelector('#setSymbol-x').value = Math.round(scaleX(card.setSymbolBounds.x));
	document.querySelector('#setSymbol-y').value = Math.round(scaleY(card.setSymbolBounds.y));
	var setSymbolZoom;
	if (setSymbol.width / setSymbol.height > scaleWidth(card.setSymbolBounds.width) / scaleHeight(card.setSymbolBounds.height)) {
		setSymbolZoom = (scaleWidth(card.setSymbolBounds.width) / setSymbol.width * 100).toFixed(1);
	} else {
		setSymbolZoom = (scaleHeight(card.setSymbolBounds.height) / setSymbol.height * 100).toFixed(1);
	}
	document.querySelector('#setSymbol-zoom').value = setSymbolZoom;
	if (card.setSymbolBounds.horizontal == 'center') {
		document.querySelector('#setSymbol-x').value = Math.round(scaleX(card.setSymbolBounds.x) - (setSymbol.width * setSymbolZoom / 100) / 2 - scaleWidth(card.marginX));
	} else if (card.setSymbolBounds.horizontal == 'right') {
		document.querySelector('#setSymbol-x').value = Math.round(scaleX(card.setSymbolBounds.x) - (setSymbol.width * setSymbolZoom / 100) - scaleWidth(card.marginX));
	}
	if (card.setSymbolBounds.vertical == 'center') {
		document.querySelector('#setSymbol-y').value = Math.round(scaleY(card.setSymbolBounds.y) - (setSymbol.height * setSymbolZoom / 100) / 2 - scaleHeight(card.marginY));
	} else if (card.setSymbolBounds.vertical == 'bottom') {
		document.querySelector('#setSymbol-y').value = Math.round(scaleY(card.setSymbolBounds.y) - (setSymbol.height * setSymbolZoom / 100) - scaleHeight(card.marginY));
	}
	setSymbolEdited();
}
function fetchSetSymbol() {
	var setCode = document.querySelector('#set-symbol-code').value.toLowerCase() || 'cmd';
	if (document.querySelector('#lockSetSymbolCode').checked) {
		localStorage.setItem('lockSetSymbolCode', setCode);
	}
	var setRarity = document.querySelector('#set-symbol-rarity').value.toLowerCase().replace('uncommon', 'u').replace('common', 'c').replace('rare', 'r').replace('mythic', 'm') || 'c';
	if (['cc', 'logan', 'joe'].includes(setCode.toLowerCase())) {
		uploadSetSymbol(fixUri(`/img/setSymbols/custom/${setCode.toLowerCase()}-${setRarity}.svg`), 'resetSetSymbol');
	} else {
		if (setSymbolAliases.has(setCode.toLowerCase())) setCode = setSymbolAliases.get(setCode.toLowerCase());
		uploadSetSymbol(fixUri(`/img/setSymbols/official/${setCode.toLowerCase()}-${setRarity}.svg`), 'resetSetSymbol');
		//imageURL('http://gatherer.wizards.com/Handlers/Image.ashx?type=symbol&set=' + setCode + '&size=large&rarity=' + setRarity, uploadSetSymbol, 'resetSetSymbol');
	}
}
function lockSetSymbolCode() {
	var savedValue = '';
	if (document.querySelector('#lockSetSymbolCode').checked) {
		savedValue = document.querySelector('#set-symbol-code').value;
	}
	localStorage.setItem('lockSetSymbolCode', savedValue);
}
function lockSetSymbolURL() {
	var savedValue = '';
	if (document.querySelector('#lockSetSymbolURL').checked) {
		savedValue = card.setSymbolSource;
	}
	localStorage.setItem('lockSetSymbolURL', savedValue);
}
//WATERMARK TAB
function uploadWatermark(imageSource, otherParams) {
	watermark.src = imageSource;
	if (otherParams && otherParams == 'resetWatermark') {
		watermark.onload = function() {
			resetWatermark();
			watermark.onload = watermarkEdited;
		};
	}
}
function watermarkLeftColor(c) {
	card.watermarkLeft = c;
	watermarkEdited();
}
function watermarkRightColor(c) {
	card.watermarkRight = c;
	watermarkEdited();
}
function watermarkEdited() {
	card.watermarkSource = watermark.src;
	card.watermarkX = document.querySelector('#watermark-x').value / card.width;
	card.watermarkY = document.querySelector('#watermark-y').value / card.height;
	card.watermarkZoom = document.querySelector('#watermark-zoom').value / 100;
	if (card.watermarkLeft == "none" && document.querySelector('#watermark-left').value != "none") {
		card.watermarkLeft = document.querySelector('#watermark-left').value;
	}
	// card.watermarkLeft = document.querySelector('#watermark-left').value;
	// card.watermarkRight =  document.querySelector('#watermark-right').value;
	card.watermarkOpacity = document.querySelector('#watermark-opacity').value / 100;
	watermarkContext.globalCompositeOperation = 'source-over';
	watermarkContext.globalAlpha = 1;
	watermarkContext.clearRect(0, 0, watermarkCanvas.width, watermarkCanvas.height);
	if (card.watermarkLeft != 'none' && !card.watermarkSource.includes('/blank.png') && card.watermarkZoom > 0) {
		if (card.watermarkRight != 'none') {
			watermarkContext.drawImage(right, scaleX(0), scaleY(0), scaleWidth(1), scaleHeight(1));
			watermarkContext.globalCompositeOperation = 'source-in';
			if (card.watermarkRight == 'default') {
				watermarkContext.drawImage(watermark, scaleX(card.watermarkX), scaleY(card.watermarkY), watermark.width * card.watermarkZoom, watermark.height * card.watermarkZoom);
			} else {
				watermarkContext.fillStyle = card.watermarkRight;
				watermarkContext.fillRect(0, 0, watermarkCanvas.width, watermarkCanvas.height);
			}
			watermarkContext.globalCompositeOperation = 'destination-over';
		}
		if (card.watermarkLeft == 'default') {
			watermarkContext.drawImage(watermark, scaleX(card.watermarkX), scaleY(card.watermarkY), watermark.width * card.watermarkZoom, watermark.height * card.watermarkZoom);
		} else {
			watermarkContext.fillStyle = card.watermarkLeft;
			watermarkContext.fillRect(0, 0, watermarkCanvas.width, watermarkCanvas.height);
		}
		watermarkContext.globalCompositeOperation = 'destination-in';
		watermarkContext.drawImage(watermark, scaleX(card.watermarkX), scaleY(card.watermarkY), watermark.width * card.watermarkZoom, watermark.height * card.watermarkZoom);
		watermarkContext.globalAlpha = card.watermarkOpacity;
		watermarkContext.fillRect(0, 0, watermarkCanvas.width, watermarkCanvas.height);
	}
	drawCard();
}
function resetWatermark() {
	var watermarkZoom;
	if (watermark.width / watermark.height > scaleWidth(card.watermarkBounds.width) / scaleHeight(card.watermarkBounds.height)) {
		watermarkZoom = (scaleWidth(card.watermarkBounds.width) / watermark.width * 100).toFixed(1);
	} else {
		watermarkZoom = (scaleHeight(card.watermarkBounds.height) / watermark.height * 100).toFixed(1);
	}
	document.querySelector('#watermark-zoom').value = watermarkZoom;
	document.querySelector('#watermark-x').value = Math.round(scaleX(card.watermarkBounds.x) - watermark.width * watermarkZoom / 200 - scaleWidth(card.marginX));
	document.querySelector('#watermark-y').value = Math.round(scaleY(card.watermarkBounds.y) - watermark.height * watermarkZoom / 200 - scaleHeight(card.marginY));
	watermarkEdited();
}
//svg cropper
function getSetSymbolWatermark(url, targetImage = watermark) {
	if (!url.includes('/')) {
		url = 'https://cdn.jsdelivr.net/npm/keyrune/svg/' + url + '.svg';
	}
	xhttp = new XMLHttpRequest();
	xhttp.open('GET', url, true);
	xhttp.overrideMimeType('image/svg+xml');
	xhttp.onload = function(event) {
		if (this.readyState == 4 && this.status == 200) {
		    var svg = document.body.appendChild(xhttp.responseXML.documentElement);
		    var box = svg.getBBox(svg);
			svg.setAttribute('viewBox', [box.x, box.y, box.width, box.height].join(' '));
			svg.setAttribute('width', box.width);
			svg.setAttribute('height', box.height);
			uploadWatermark('data:image/svg+xml,' + encodeURIComponent(svg.outerHTML), 'resetWatermark');
			svg.remove();
		} else if (this.status == 404) {
			throw new Error('Improper Set Code');
		}
	}
	xhttp.send();
}
//Bottom Info Tab
async function loadBottomInfo(textObjects = []) {
	await bottomInfoContext.clearRect(0, 0, bottomInfoCanvas.width, bottomInfoCanvas.height);
	card.bottomInfo = null;
	card.bottomInfo = textObjects;
	await bottomInfoEdited();
	bottomInfoEdited();
}
async function bottomInfoEdited() {
	await bottomInfoContext.clearRect(0, 0, bottomInfoCanvas.width, bottomInfoCanvas.height);
	card.infoNumber = document.querySelector('#info-number').value;
	card.infoRarity = document.querySelector('#info-rarity').value;
	card.infoSet = document.querySelector('#info-set').value;
	card.infoLanguage = document.querySelector('#info-language').value;
	card.infoArtist = document.querySelector('#info-artist').value;
	card.infoYear = document.querySelector('#info-year').value;
	for (var textObject of Object.entries(card.bottomInfo)) {
		if (["NOT FOR SALE", "Wizards of the Coast", "CardConjurer.com", "cardconjurer.com"].some(v => textObject[1].text.includes(v))) {
			continue;
		} else {
			await writeText(textObject[1], bottomInfoContext);
		}
		continue;
	}
	drawCard();
}
function artistEdited(value) {
	document.querySelector('#art-artist').value = value;
	document.querySelector('#info-artist').value = value;
	bottomInfoEdited();
}
function toggleStarDot() {
	for (var key of Object.keys(card.bottomInfo)) {
		var text = card.bottomInfo[key].text
		if (text.includes('*')) {
			card.bottomInfo[key].text = text.replace('*', ' \u2022 ');
		} else {
			card.bottomInfo[key].text = text.replace(' \u2022 ', '*');
		}
	}
	defaultCollector.starDot = !defaultCollector.starDot;
	bottomInfoEdited();
}
function enableImportCollectorInfo() {
	localStorage.setItem('enableImportCollectorInfo', document.querySelector('#enableImportCollectorInfo').checked);
}
function removeDefaultCollector() {
	defaultCollector = {}; //{number: year, rarity:'P', setCode:'MTG', lang:'EN', starDot:false};
	localStorage.removeItem('defaultCollector'); //localStorage.setItem('defaultCollector', JSON.stringify(defaultCollector));
}
function setDefaultCollector() {
	starDot = defaultCollector.starDot;
	defaultCollector = {
		number: document.querySelector('#info-number').value,
		rarity: document.querySelector('#info-rarity').value,
		setCode: document.querySelector('#info-set').value,
		lang: document.querySelector('#info-language').value,
		starDot: starDot
	};
	localStorage.setItem('defaultCollector', JSON.stringify(defaultCollector));
}
//DRAWING THE CARD (putting it all together)
function drawCard() {
	// reset
	cardContext.globalCompositeOperation = 'source-over';
	cardContext.clearRect(0, 0, cardCanvas.width, cardCanvas.height);
	// art
	cardContext.save();
	cardContext.translate(scaleX(card.artX), scaleY(card.artY));
	cardContext.rotate(Math.PI / 180 * (card.artRotate || 0));
	cardContext.drawImage(art, 0, 0, art.width * card.artZoom, art.height * card.artZoom);
	cardContext.restore();
	// frame elements
	if (card.version.includes('planeswalker') && typeof planeswalkerPreFrameCanvas !== "undefined") {
		cardContext.drawImage(planeswalkerPreFrameCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	}
	cardContext.drawImage(frameCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	if (card.version.toLowerCase().includes('planeswalker') && typeof planeswalkerPostFrameCanvas !== "undefined") {
		cardContext.drawImage(planeswalkerPostFrameCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	} else if (card.version.toLowerCase().includes('planeswalker') && typeof planeswalkerCanvas !== "undefined") {
		cardContext.drawImage(planeswalkerCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	} else if (card.version.toLowerCase().includes('qrcode') && typeof qrCodeCanvas !== "undefined") {
		cardContext.drawImage(qrCodeCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	} // REMOVE/DELETE PLANESWALKERCANVAS AFTER A FEW WEEKS
	// guidelines
	if (document.querySelector('#show-guidelines').checked) {
		cardContext.drawImage(guidelinesCanvas, scaleX(card.marginX) / 2, scaleY(card.marginY) / 2, cardCanvas.width, cardCanvas.height);
	}
	// watermark
	cardContext.drawImage(watermarkCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	// custom elements for sagas, classes, and dungeons
	if (card.version.toLowerCase().includes('saga') && typeof sagaCanvas !== "undefined") {
		cardContext.drawImage(sagaCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	} else if (card.version.toLowerCase().includes('class') && typeof classCanvas !== "undefined") {
		cardContext.drawImage(classCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	} else if (card.version.toLowerCase().includes('dungeon') && typeof dungeonCanvas !== "undefined") {
		cardContext.drawImage(dungeonCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	}
	// text
	cardContext.drawImage(textCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	// set symbol
	cardContext.drawImage(setSymbol, scaleX(card.setSymbolX), scaleY(card.setSymbolY), setSymbol.width * card.setSymbolZoom, setSymbol.height * card.setSymbolZoom)
	// bottom info
	cardContext.drawImage(bottomInfoCanvas, 0, 0, cardCanvas.width, cardCanvas.height);
	// cutout the corners
	cardContext.globalCompositeOperation = 'destination-out';
	if (!card.noCorners && (card.marginX == 0 && card.marginY == 0)) {
		cardContext.drawImage(corner, 0, 0, scaleWidth(59/1500), scaleWidth(59/1500));
		cardContext.rotate(Math.PI / 2);
		cardContext.drawImage(corner, 0, -card.width, scaleWidth(59/1500), scaleWidth(59/1500));
		cardContext.rotate(Math.PI / 2);
		cardContext.drawImage(corner, -card.width, -card.height, scaleWidth(59/1500), scaleWidth(59/1500));
		cardContext.rotate(Math.PI / 2);
		cardContext.drawImage(corner, -card.height, 0, scaleWidth(59/1500), scaleWidth(59/1500));
		cardContext.rotate(Math.PI / 2);
	}
	// show preview
	previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
	previewContext.drawImage(cardCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
}
//DOWNLOADING
function downloadCard(alt = false) {
	if (card.infoArtist.replace(/ /g, '') == '' && !card.artSource.includes('/img/blank.png') && !card.artZoom == 0) {
		notify('You must credit an artist before downloading!', 5);
	} else {
		// Prep file information
		const imageDataURL = cardCanvas.toDataURL('image/png');
		var imageName = getCardName() + '.png';
		// Download image
		if (alt) {
			const newWindow = window.open('about:blank');
			setTimeout(function(){
				newWindow.document.body.appendChild(newWindow.document.createElement('img')).src = imageDataURL;
				newWindow.document.querySelector('img').style = 'max-height: 100vh; max-width: 100vw;';
				newWindow.document.body.style = 'padding: 0; margin: 0; text-align: center; background-color: #888;';
				newWindow.document.title = imageName;
			}, 0);
		} else {
			const downloadElement = document.createElement('a');
			downloadElement.download = imageName;
			downloadElement.target = '_blank';
			downloadElement.href = imageDataURL;
			document.body.appendChild(downloadElement);
			downloadElement.click();
			downloadElement.remove();
		}
	}
}
//IMPORT/SAVE TAB
function importCard(cardObject) {
	scryfallCard = cardObject;
	const importIndex = document.querySelector('#import-index');
	importIndex.innerHTML = null;
	var optionIndex = 0;
	cardObject.forEach(card => {
		if (card.type_line && card.type_line != 'Card') {
			var option = document.createElement('option');
			option.innerHTML = `${card.name} (${card.type_line})`;
			option.value = optionIndex;
			importIndex.appendChild(option);
		}
		optionIndex ++;
	});
	changeCardIndex();
}
function changeCardIndex() {
	var cardToImport = scryfallCard[document.querySelector('#import-index').value];
	//text
	var langFontCode = "";
	if (cardToImport.lang == "ph") {langFontCode = "{fontphyrexian}"}
	if (card.text.title) {card.text.title.text = langFontCode + curlyQuotes(cardToImport.name || '');}
	if (card.text.nickname) {card.text.nickname.text = cardToImport.flavor_name || '';}
	if (card.text.mana) {card.text.mana.text = cardToImport.mana_cost || '';}
	if (card.text.type) {card.text.type.text = langFontCode + cardToImport.type_line || '';}
	if (card.text.rules) {
		var rulesText = curlyQuotes((cardToImport.oracle_text || '').replace('(', '{i}(').replace(')', '){/i}')).replace(/{Q}/g, '{untap}').replace(/{\u221E}/g, "{inf}").replace(/• /g, '• {indent}');
		card.text.rules.text = langFontCode + rulesText;
		if (cardToImport.flavor_text) {
			var flavorText = cardToImport.flavor_text;
			var flavorTextCounter = 1;
			while (flavorText.includes('*') || flavorText.includes('"')) {
				if (flavorTextCounter % 2) {
					flavorText = flavorText.replace('*', '{/i}');
					flavorText = flavorText.replace('"', '\u201c');
				} else {
					flavorText = flavorText.replace('*', '{i}');
					flavorText = flavorText.replace('"', '\u201d');
				}
				flavorTextCounter ++;
			}
			card.text.rules.text += '{flavor}' + curlyQuotes(flavorText.replace('\n', '{lns}'));
		}
	}
	if (card.text.pt) {card.text.pt.text = cardToImport.power + '/' + cardToImport.toughness || '';}
	if (card.text.pt && card.text.pt.text == undefined + '/' + undefined) {card.text.pt.text = '';}
	if (card.version.includes('planeswalker')) {
		card.text.loyalty.text = cardToImport.loyalty || '';
		var planeswalkerAbilities = cardToImport.oracle_text.split('\n');
		while (planeswalkerAbilities.length > 4) {
			var newAbility = planeswalkerAbilities[planeswalkerAbilities.length - 2] + '\n' + planeswalkerAbilities.pop();
			planeswalkerAbilities[planeswalkerAbilities.length - 1] = newAbility;
		}
		for (var i = 0; i < 4; i ++) {
			if (planeswalkerAbilities[i]) {
				var planeswalkerAbility = planeswalkerAbilities[i].replace(': ', 'splitstring').split('splitstring');
				if (!planeswalkerAbility[1]) {
					planeswalkerAbility = ['', planeswalkerAbility[0]];
				}
				card.text['ability' + i].text = planeswalkerAbility[1].replace('(', '{i}(').replace(')', '){/i}');
				if (card.version == 'planeswalkerTall') {
					document.querySelector('#planeswalker-height-' + i).value = Math.round(scaleHeight(0.3572) / planeswalkerAbilities.length);
				} else {
					document.querySelector('#planeswalker-height-' + i).value = Math.round(scaleHeight(0.2915) / planeswalkerAbilities.length);
				}
				document.querySelector('#planeswalker-cost-' + i).value = planeswalkerAbility[0].replace('\u2212', '-');
			} else {
				card.text['ability' + i].text = '';
				document.querySelector('#planeswalker-height-' + i).value = 0;
			}
		}
		planeswalkerEdited();
	} else if (card.version.includes('saga')) {
		card.text.ability0.text = cardToImport.oracle_text.replace('(', '{i}(').replace(')', '){/i}') || '';
	}
	document.querySelector('#text-editor').value = card.text[Object.keys(card.text)[selectedTextIndex]].text;
	textEdited();
	//collector's info
	if (localStorage.getItem('enableImportCollectorInfo') == 'true') {
		document.querySelector('#info-number').value = cardToImport.collector_number || "";
		document.querySelector('#info-rarity').value = (cardToImport.rarity || "")[0].toUpperCase();
		document.querySelector('#info-set').value = (cardToImport.set || "").toUpperCase();
		document.querySelector('#info-language').value = (cardToImport.lang || "").toUpperCase();
		var setXhttp = new XMLHttpRequest();
		setXhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var setObject = JSON.parse(this.responseText)
				if (setObject.printed_size) {
					document.querySelector('#info-number').value += "/" + setObject.printed_size;
					bottomInfoEdited();
				}
			}
		}
		setXhttp.open('GET', "https://api.scryfall.com/sets/" + cardToImport.set, true);
		try {
			setXhttp.send();
		} catch {
			console.log('Scryfall API search failed.')
		}
	}
	//art
	document.querySelector('#art-name').value = cardToImport.name;
	fetchScryfallData(cardToImport.name, artFromScryfall, true);
	//set symbol
	if (!document.querySelector('#lockSetSymbolCode').checked) {
		document.querySelector('#set-symbol-code').value = cardToImport.set;
	}
	document.querySelector('#set-symbol-rarity').value = cardToImport.rarity.slice(0, 1);
	if (!document.querySelector('#lockSetSymbolURL').checked) {
		fetchSetSymbol();
	}
}
function loadAvailableCards(cardKeys = JSON.parse(localStorage.getItem('cardKeys'))) {
	if (!cardKeys) {
		cardKeys = [];
		cardKeys.sort();
		localStorage.setItem('cardKeys', JSON.stringify(cardKeys));
	}
	document.querySelector('#load-card-options').innerHTML = '<option selected="selected" disabled>None selected</option>';
	cardKeys.forEach(item => {
		var cardKeyOption = document.createElement('option');
		cardKeyOption.innerHTML = item;
		document.querySelector('#load-card-options').appendChild(cardKeyOption);
	});
}
function saveCard(saveFromFile) {
	var cardKeys = JSON.parse(localStorage.getItem('cardKeys')) || [];
	var cardKey, cardToSave;
	if (saveFromFile) {
		cardKey = saveFromFile.key;
	} else {
		cardKey = getCardName();
	}
	if (!saveFromFile) {
		cardKey = prompt('Enter the name you would like to save your card under:', cardKey);
		if (!cardKey) {return null;}
	}
	cardKey = cardKey.trim();
	if (cardKeys.includes(cardKey)) {
		if (!confirm('Would you like to overwrite your card previously saved as "' + cardKey + '"?\n(Clicking "cancel" will affix a version number)')) {
			var originalCardKey = cardKey;
			var cardKeyNumber = 1;
			while (cardKeys.includes(cardKey)) {
				cardKey = originalCardKey + ' (' + cardKeyNumber + ')';
				cardKeyNumber ++;
			}
		}
	}
	if (saveFromFile) {
		cardToSave = saveFromFile.data;
	} else {
		cardToSave = JSON.parse(JSON.stringify(card));
		cardToSave.frames.forEach(frame => {
			delete frame.image;
			frame.masks.forEach(mask => delete mask.image);
		});
	}
	try {
		localStorage.setItem(cardKey, JSON.stringify(cardToSave));
		if (!cardKeys.includes(cardKey)) {
			cardKeys.push(cardKey);
			cardKeys.sort();
			localStorage.setItem('cardKeys', JSON.stringify(cardKeys));
			loadAvailableCards(cardKeys);
		}
	} catch (error) {
		notify('You have exceeded your 5MB of local storage, and your card has failed to save. If you would like to continue saving cards, please download all saved cards, then delete all saved cards to free up space.<br><br>Local storage is most often exceeded by uploading large images directly from your computer. If possible/convenient, using a URL avoids the need to save these large images.<br><br>Apologies for the inconvenience.');
	}
}
async function loadCard(selectedCardKey) {
	//clear the draggable frames
	document.querySelector('#frame-list').innerHTML = null;
	//clear the existing card, then replace it with the new JSON
	card = {};
	card = JSON.parse(localStorage.getItem(selectedCardKey));
	//if the card was loaded properly...
	if (card) {
		//load values from card into html inputs
		document.querySelector('#info-number').value = card.infoNumber;
		document.querySelector('#info-rarity').value = card.infoRarity;
		document.querySelector('#info-set').value = card.infoSet;
		document.querySelector('#info-language').value = card.infoLanguage;
		document.querySelector('#info-year').value = card.infoYear || date.getFullYear();
		artistEdited(card.infoArtist);
		document.querySelector('#text-editor').value = card.text[Object.keys(card.text)[selectedTextIndex]].text;
		loadTextOptions(card.text);
		document.querySelector('#art-x').value = scaleX(card.artX) - scaleWidth(card.marginX);
		document.querySelector('#art-y').value = scaleY(card.artY) - scaleHeight(card.marginY);
		document.querySelector('#art-zoom').value = card.artZoom * 100;
		document.querySelector('#art-rotate').value = card.artRotate || 0;
		uploadArt(card.artSource);
		document.querySelector('#setSymbol-x').value = scaleX(card.setSymbolX) - scaleWidth(card.marginX);
		document.querySelector('#setSymbol-y').value = scaleY(card.setSymbolY) - scaleHeight(card.marginY);
		document.querySelector('#setSymbol-zoom').value = card.setSymbolZoom * 100;
		uploadSetSymbol(card.setSymbolSource);
		document.querySelector('#watermark-x').value = scaleX(card.watermarkX) - scaleWidth(card.marginX);
		document.querySelector('#watermark-y').value = scaleY(card.watermarkY) - scaleHeight(card.marginY);
		document.querySelector('#watermark-zoom').value = card.watermarkZoom * 100;
		// document.querySelector('#watermark-left').value = card.watermarkLeft;
		// document.querySelector('#watermark-right').value = card.watermarkRight;
		document.querySelector('#watermark-opacity').value = card.watermarkOpacity * 100;
		document.getElementById("rounded-corners").checked = !card.noCorners;
		uploadWatermark(card.watermarkSource);
		card.frames.reverse();
		await card.frames.forEach(item => addFrame([], item));
		card.frames.reverse();
		if (card.onload) {
			await loadScript(card.onload);
		}
		card.manaSymbols.forEach(item => loadScript(item));
		//canvases
		var canvasesResized = false;
		canvasList.forEach(name => {
			if (window[name + 'Canvas'].width != card.width * (1 + card.marginX) || window[name + 'Canvas'].height != card.height * (1 + card.marginY)) {
				sizeCanvas(name);
				canvasesResized = true;
			}
		});
		if (canvasesResized) {
			drawTextBuffer();
			drawFrames();
			bottomInfoEdited();
			watermarkEdited();
		}
	} else {
		notify(selectedCardKey + ' failed to load.', 5)
	}
}
function deleteCard() {
	var keyToDelete = document.querySelector('#load-card-options').value;
	if (keyToDelete) {
		var cardKeys = JSON.parse(localStorage.getItem('cardKeys'));
		cardKeys.splice(cardKeys.indexOf(keyToDelete), 1);
		cardKeys.sort();
		localStorage.setItem('cardKeys', JSON.stringify(cardKeys));
		localStorage.removeItem(keyToDelete);
		loadAvailableCards(cardKeys);
	}
}
function deleteSavedCards() {
	if (confirm('WARNING:\n\nALL of your saved cards will be deleted! If you would like to save these cards, please make sure you have downloaded them first. There is no way to undo this.\n\n(Press "OK" to delete your cards)')) {
		var cardKeys = JSON.parse(localStorage.getItem('cardKeys'));
		cardKeys.forEach(key => localStorage.removeItem(key));
		localStorage.setItem('cardKeys', JSON.stringify([]));
		loadAvailableCards([]);
	}
}
async function downloadSavedCards() {
	var cardKeys = JSON.parse(localStorage.getItem('cardKeys'));
	if (cardKeys) {
		var allSavedCards = [];
		cardKeys.forEach(item => {
			allSavedCards.push({key:item, data:JSON.parse(localStorage.getItem(item))});
		});
		var download = document.createElement('a');
		download.href = URL.createObjectURL(new Blob([JSON.stringify(allSavedCards)], {type:'text'}));
		download.download = 'saved-cards.cardconjurer';
		document.body.appendChild(download);
		await download.click();
		download.remove();
	}
}
function uploadSavedCards(event) {
	var reader = new FileReader();
	reader.onload = function () {
		JSON.parse(reader.result).forEach(item => saveCard(item));
	}
	reader.readAsText(event.target.files[0]);
}
//TUTORIAL TAB
function loadTutorialVideo() {
	var video = document.querySelector('.video > iframe');
	if (video.src == '') {
		video.src = 'https://www.youtube-nocookie.com/embed/e4tnOiub41g?rel=0';
	}
}
// GUIDELINES
function drawNewGuidelines() {
	// clear
	guidelinesContext.clearRect(0, 0, guidelinesCanvas.width, guidelinesCanvas.height);
	// set opacity
	guidelinesContext.globalAlpha = 0.25;
	// textboxes
	guidelinesContext.fillStyle = 'blue';
	Object.entries(card.text).forEach(item => {
		guidelinesContext.fillRect(scaleX(item[1].x || 0), scaleY(item[1].y || 0), scaleWidth(item[1].width || 1), scaleHeight(item[1].height || 1));
	});
	// art
	guidelinesContext.fillStyle = 'green';
	guidelinesContext.fillRect(scaleX(card.artBounds.x), scaleY(card.artBounds.y), scaleWidth(card.artBounds.width), scaleHeight(card.artBounds.height));
	// watermark
	guidelinesContext.fillStyle = 'yellow';
	var watermarkWidth = scaleWidth(card.watermarkBounds.width);
	var watermarkHeight = scaleHeight(card.watermarkBounds.height);
	guidelinesContext.fillRect(scaleX(card.watermarkBounds.x) - watermarkWidth / 2, scaleY(card.watermarkBounds.y) - watermarkHeight / 2, watermarkWidth, watermarkHeight);
	// set symbol
	var setSymbolX = scaleX(card.setSymbolBounds.x);
	var setSymbolY = scaleY(card.setSymbolBounds.y);
	var setSymbolWidth = scaleWidth(card.setSymbolBounds.width);
	var setSymbolHeight = scaleHeight(card.setSymbolBounds.height);
	if (card.setSymbolBounds.vertical == 'center') {
		setSymbolY -= setSymbolHeight / 2;
	} else if (card.setSymbolBounds.vertical == 'bottom') {
		setSymbolY -= setSymbolHeight;
	}
	if (card.setSymbolBounds.horizontal == 'center') {
		setSymbolX -= setSymbolWidth / 2;
	} else if (card.setSymbolBounds.horizontal == 'right') {
		setSymbolX -= setSymbolWidth;
	}
	guidelinesContext.fillStyle = 'red';
	guidelinesContext.fillRect(setSymbolX, setSymbolY, setSymbolWidth, setSymbolHeight);
	// grid
	guidelinesContext.globalAlpha = 1;
	guidelinesContext.beginPath();
	guidelinesContext.strokeStyle = 'gray';
	guidelinesContext.lineWidth = 1;
	const boxPadding = 25;
	for (var x = 0; x <= card.width; x += boxPadding) {
		guidelinesContext.moveTo(x, 0);
		guidelinesContext.lineTo(x, card.height);
	}
	for (var y = 0; y <= card.height; y += boxPadding) {
		guidelinesContext.moveTo(0, y);
		guidelinesContext.lineTo(card.width, y);
	}
	guidelinesContext.stroke();
	//center lines
	guidelinesContext.beginPath();
	guidelinesContext.strokeStyle = 'black';
	guidelinesContext.lineWidth = 3;
	guidelinesContext.moveTo(card.width / 2, 0);
	guidelinesContext.lineTo(card.width / 2, card.height);
	guidelinesContext.moveTo(0, card.height / 2);
	guidelinesContext.lineTo(card.width, card.height / 2);
	guidelinesContext.stroke();
	//draw to card
	drawCard();
}
//HIGHLIGHT TRANSPARENCIES
function toggleCardBackgroundColor(highlight) {
	if (highlight) {
		previewCanvas.style["background-color"] = "#ff007fff";
	} else {
		previewCanvas.style["background-color"] = "#0000";
	}
}
//Rounded Corners
function setRoundedCorners(value) {
	card.noCorners = !value;
	drawCard();
}
//Various loaders
function imageURL(url, destination, otherParams) {
	var imageurl = url;
	// If an image URL does not have HTTP in it, assume it's a local file in the repo local_art directory.
	if (!url.includes('http')) {
		imageurl = '/local_art/' + url;
	} else if (params.get('noproxy') != '') {
		//CORS PROXY LINKS
		//Previously: https://cors.bridged.cc/
		imageurl = 'https://api.codetabs.com/v1/proxy?quest=' + url;
	}
	destination(imageurl, otherParams);
}
async function imageLocal(event, destination, otherParams) {
	var reader = new FileReader();
	reader.onload = function () {
		destination(reader.result, otherParams);
	}
	reader.onerror = function () {
		destination('/img/blank.png', otherParams);
	}
	await reader.readAsDataURL(event.target.files[0]);
}
function loadScript(scriptPath) {
	var script = document.createElement('script');
	script.setAttribute('type', 'text/javascript');
	script.onerror = function(){notify('A script failed to load, likely due to an update. Please reload your page. Sorry for the inconvenience.');}
	script.setAttribute('src', scriptPath);
	if (typeof script != 'undefined') {
		document.querySelectorAll('head')[0].appendChild(script);
	}
}
// Stretchable SVGs
function stretchSVG(frameObject) {
	xhr = new XMLHttpRequest();
	xhr.open('GET', fixUri(frameObject.src), true);
	xhr.overrideMimeType('image/svg+xml');
	xhr.onload = function(e) {
		if (this.readyState == 4 && this.status == 200) {
			frameObject.image.src = 'data:image/svg+xml;charset=utf-8,' + stretchSVGReal((new XMLSerializer).serializeToString(this.responseXML.documentElement), frameObject);
		}
	}
	xhr.send();
}
function stretchSVGReal(data, frameObject) {
	var returnData = data;
	frameObject.stretch.forEach(stretch => {
		const change = stretch.change;
		const targets = stretch.targets;
		const name = stretch.name;
		const oldData = returnData.split(name + '" d="')[1].split('" style=')[0];
		var newData = '';
		const listData = oldData.split(/(?=[clmz])/gi);
		for (i = 0; i < listData.length; i ++) {
			const item = listData[i];
			if (targets.includes(i) || targets.includes(-i)) {
				let sign = 1;
				if (i != 0 && targets.includes(-i)) {sign = -1};
				if (item[0] == 'C' || item[0] == 'c') {
					newCoords = [];
					item.slice(1).split(' ').forEach(pair => {
						coords = pair.split(',');
						newCoords.push((scaleWidth(change[0]) * sign + parseFloat(coords[0])) + ',' + (scaleHeight(change[1]) * sign + parseFloat(coords[1])));
					});
					newData += item[0] + newCoords.join(' ');
				} else {
					const coords = item.slice(1).split(/[, ]/);
					newData += item[0] + (scaleWidth(change[0]) * sign + parseFloat(coords[0])) + ',' + (scaleHeight(change[1]) * sign + parseFloat(coords[1]))
				}
			} else {
				newData += item;
			}
		}
		returnData = returnData.replace(oldData, newData);
	});
	return returnData;
}
//SCRYFALL STUFF MAY BE CHANGED IN THE FUTURE
function fetchScryfallData(cardName, callback = console.log, searchUniqueArt = '') {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			responseCards = [];
			importedCards = JSON.parse(this.responseText).data;
			importedCards.forEach(card => {
				if ('card_faces' in card) {
					card.card_faces.forEach(face => {
						face.set = card.set;
						face.rarity = card.rarity;
						if (card.lang != 'en') {
							face.oracle_text = face.printed_text;
							face.name = face.printed_name;
							face.type_line = face.printed_type_line;
						}
						responseCards.push(face);
					});
				} else {
					if (card.lang != 'en') {
						card.oracle_text = card.printed_text;
						card.name = card.printed_name;
						card.type_line = card.printed_type_line;
					}
					responseCards.push(card);
				}
			});
			callback(responseCards);
		} else if (this.readyState == 4 && this.status == 404 && !searchUniqueArt && cardName != '') {
			notify(`No cards found for "${cardName}" in ${cardLanguageSelect.options[cardLanguageSelect.selectedIndex].text}.`, 5);
		}
	}
	cardLanguageSelect = document.querySelector('#import-language');
	var cardLanguage = `lang%3D${cardLanguageSelect.value}`;
	var uniqueArt = '';
	if (searchUniqueArt) {
		uniqueArt = '&unique=art';
	}
	xhttp.open('GET', `https://api.scryfall.com/cards/search?order=released&include_extras=true${uniqueArt}&q=name%3D${cardName.replace(/ /g, '_')}%20${cardLanguage}`, true);
	try {
		xhttp.send();
	} catch {
		console.log('Scryfall API search failed.')
	}
}
// INITIALIZATION

// auto load frame version (user defaults)
if (!localStorage.getItem('autoLoadFrameVersion')) {
	localStorage.setItem('autoLoadFrameVersion', document.querySelector('#autoLoadFrameVersion').checked);
}
document.querySelector('#autoLoadFrameVersion').checked = 'true' == localStorage.getItem('autoLoadFrameVersion');

// collector info (user defaults)
var defaultCollector = JSON.parse(localStorage.getItem('defaultCollector') || '{}');
if ('number' in defaultCollector) {
	document.querySelector('#info-number').value = defaultCollector.number;
	document.querySelector('#info-rarity').value = defaultCollector.rarity;
	document.querySelector('#info-set').value = defaultCollector.setCode;
	document.querySelector('#info-language').value = defaultCollector.lang;
	if (defaultCollector.starDot) {setTimeout(function(){defaultCollector.starDot = false; toggleStarDot();}, 500);}
} else {
	document.querySelector('#info-number').value = date.getFullYear();
}
if (!localStorage.getItem('enableImportCollectorInfo')) {
	localStorage.setItem('enableImportCollectorInfo', 'false');
} else {
	document.querySelector('#enableImportCollectorInfo').checked = (localStorage.getItem('enableImportCollectorInfo') == 'true');
}

// lock set symbol code (user defaults)
if (!localStorage.getItem('lockSetSymbolCode')) {
	localStorage.setItem('lockSetSymbolCode', '');
}
document.querySelector('#lockSetSymbolCode').checked = '' != localStorage.getItem('lockSetSymbolCode');
if (document.querySelector('#lockSetSymbolCode').checked) {
	document.querySelector('#set-symbol-code').value = localStorage.getItem('lockSetSymbolCode');
	fetchSetSymbol();
}

// lock set symbol url (user defaults)
if (!localStorage.getItem('lockSetSymbolURL')) {
	localStorage.setItem('lockSetSymbolURL', '');
}
document.querySelector('#lockSetSymbolURL').checked = '' != localStorage.getItem('lockSetSymbolURL');
if (document.querySelector('#lockSetSymbolURL').checked) {
	setSymbol.src = localStorage.getItem('lockSetSymbolURL');
}

//bind inputs together
bindInputs('#frame-editor-hsl-hue', '#frame-editor-hsl-hue-slider');
bindInputs('#frame-editor-hsl-saturation', '#frame-editor-hsl-saturation-slider');
bindInputs('#frame-editor-hsl-lightness', '#frame-editor-hsl-lightness-slider');
bindInputs('#show-guidelines', '#show-guidelines-2', true);

// Load / init whatever
loadScript('/js/frames/groupStandard-3.js');
loadAvailableCards();
initDraggableArt();
