let img;
let texture;
let riso_blend_mode;
let risoLayers = [];
let currentDisplaySize = { width: 0, height: 0 }; // Store current image display dimensions

// Global defaults
let defaults = {
  blendMode: 'REMOVE',
  texture: 'RSCO-Risograph-Sample-90-percent-compressed.jpg',
  jitterPixels: 2,
  jitterRotation: 0.5, // degrees
  textOpacity: 150,
  textContent: 'ABOLISH',
  textSize: 80,
  textX: 50, // percentage
  textY: 70  // percentage
};

// Available Riso colors from p5.riso.js
let availableColors = [
  'red', 'blue', 'green', 'yellow', 'orange', 'violet', 'teal', 'pink',
  'black', 'gray', 'white', 'burgundy', 'brown', 'cyan', 'lime', 'magenta'
];

let layerIdCounter = 0;

function preload() {
  img = loadImage('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Crystals_growing_from_melted_sulfur.jpg/500px-Crystals_growing_from_melted_sulfur.jpg');
  
  // Load initial texture
  loadTexture(defaults.texture);
}

function loadTexture(filename) {
  texture = loadImage('textures/compressed/' + filename);
}

function setup() {
  // Calculate container size based on window dimensions
  let containerWidth = windowWidth * 0.6; // Middle section takes 60% of window width
  let containerHeight = windowHeight * 0.8; // Use 80% of window height
  
  // Calculate image display size to fit within container
  let { displayWidth, displayHeight } = calculateImageSize(img, containerWidth, containerHeight);
  
  // Store the display dimensions for consistent use
  currentDisplaySize.width = displayWidth;
  currentDisplaySize.height = displayHeight;
  
  // Add padding around the image to accommodate jitter
  let maxJitter = 20; // Maximum possible jitter in pixels
  let canvasWidth = displayWidth + (maxJitter * 4); // Extra space on all sides
  let canvasHeight = displayHeight + (maxJitter * 4);
  
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvas-container');
  
  pixelDensity(1);
  
  // Create initial layers
  addLayer('blue', 'red');
  addLayer('red', 'red');
  
  setupControls();
  updateDisplay();
}

function calculateImageSize(image, maxWidth, maxHeight) {
  let displayWidth = image.width;
  let displayHeight = image.height;
  
  // Calculate scale to fit within container while maintaining aspect ratio
  let scaleX = maxWidth / image.width;
  let scaleY = maxHeight / image.height;
  let scale = min(scaleX, scaleY, 1); // Don't scale up, only down
  
  displayWidth = image.width * scale;
  displayHeight = image.height * scale;
  
  return { displayWidth, displayHeight, scale };
}

function addLayer(colorName, channelType) {
  let layer = {
    id: layerIdCounter++,
    colorName: colorName,
    channelType: channelType, // 'red', 'blue', 'green', etc.
    risoObject: new Riso(colorName),
    useCustomJitter: false,
    customJitterPixels: defaults.jitterPixels,
    customJitterRotation: defaults.jitterRotation,
    hasTextCutout: true
  };
  
  risoLayers.push(layer);
  rebuildLayerUI();
  return layer;
}

function removeLayer(layerId) {
  risoLayers = risoLayers.filter(layer => layer.id !== layerId);
  rebuildLayerUI();
}

function rebuildLayerUI() {
  // Clear existing layer controls
  let layersContainer = select('#layers-container');
  layersContainer.html('');
  
  // Add each layer's controls
  risoLayers.forEach(layer => {
    let layerDiv = createDiv('');
    layerDiv.class('layer-controls');
    layerDiv.parent(layersContainer);
    
    // Layer header
    let headerDiv = createDiv('');
    headerDiv.class('layer-header');
    headerDiv.parent(layerDiv);
    
    let title = createDiv(`Layer ${layer.id}: ${layer.colorName.toUpperCase()}`);
    title.class('layer-title');
    title.parent(headerDiv);
    
    let deleteBtn = createButton('Delete');
    deleteBtn.class('delete-layer-btn');
    deleteBtn.parent(headerDiv);
    deleteBtn.mousePressed(() => {
      removeLayer(layer.id);
      updateDisplay();
    });
    
    // Color selection
    let colorDiv = createDiv('');
    colorDiv.class('inline-control');
    colorDiv.parent(layerDiv);
    let colorLabel = createDiv('Color:');
    colorLabel.parent(colorDiv);
    let colorSelect = createSelect();
    colorSelect.parent(colorDiv);
    availableColors.forEach(color => {
      colorSelect.option(color);
    });
    colorSelect.selected(layer.colorName);
    colorSelect.changed(() => {
      layer.colorName = colorSelect.value();
      layer.risoObject = new Riso(layer.colorName);
      rebuildLayerUI();
      updateDisplay();
    });
    
    // Channel selection
    let channelDiv = createDiv('');
    channelDiv.class('inline-control');
    channelDiv.parent(layerDiv);
    let channelLabel = createDiv('Channel:');
    channelLabel.parent(channelDiv);
    let channelSelect = createSelect();
    channelSelect.parent(channelDiv);
    channelSelect.option('red');
    channelSelect.option('blue');
    channelSelect.option('green');
    channelSelect.selected(layer.channelType);
    channelSelect.changed(() => {
      layer.channelType = channelSelect.value();
      updateDisplay();
    });
    
    // Text cutout checkbox
    let cutoutDiv = createDiv('');
    cutoutDiv.class('inline-control');
    cutoutDiv.parent(layerDiv);
    let cutoutCheckbox = createCheckbox('Text Cutout', layer.hasTextCutout);
    cutoutCheckbox.parent(cutoutDiv);
    cutoutCheckbox.changed(() => {
      layer.hasTextCutout = cutoutCheckbox.checked();
      updateDisplay();
    });
    
    // Custom jitter checkbox
    let customJitterDiv = createDiv('');
    customJitterDiv.class('inline-control');
    customJitterDiv.parent(layerDiv);
    let customJitterCheckbox = createCheckbox('Custom Jitter', layer.useCustomJitter);
    customJitterCheckbox.parent(customJitterDiv);
    customJitterCheckbox.changed(() => {
      layer.useCustomJitter = customJitterCheckbox.checked();
      rebuildLayerUI();
      updateDisplay();
    });
    
    // Custom jitter controls (shown only if enabled)
    if (layer.useCustomJitter) {
      let pixelsDiv = createDiv('');
      pixelsDiv.class('inline-control');
      pixelsDiv.parent(layerDiv);
      let pixelsLabel = createDiv('Pixels:');
      pixelsLabel.parent(pixelsDiv);
      let pixelsInput = createInput(layer.customJitterPixels.toString(), 'number');
      pixelsInput.attribute('min', '0');
      pixelsInput.attribute('max', '20');
      pixelsInput.attribute('step', '1');
      pixelsInput.parent(pixelsDiv);
      pixelsInput.input(() => {
        layer.customJitterPixels = parseInt(pixelsInput.value()) || 0;
        updateDisplay();
      });
      
      let rotationDiv = createDiv('');
      rotationDiv.class('inline-control');
      rotationDiv.parent(layerDiv);
      let rotationLabel = createDiv('Rotation:');
      rotationLabel.parent(rotationDiv);
      let rotationInput = createInput(layer.customJitterRotation.toString(), 'number');
      rotationInput.attribute('min', '0');
      rotationInput.attribute('max', '10');
      rotationInput.attribute('step', '0.1');
      rotationInput.parent(rotationDiv);
      rotationInput.input(() => {
        layer.customJitterRotation = parseFloat(rotationInput.value()) || 0;
        updateDisplay();
      });
    }
  });
}

function setupControls() {
  // Blend mode dropdown
  let blendSelect = select('#blendMode');
  if (blendSelect) {
    blendSelect.changed(() => {
      defaults.blendMode = blendSelect.value();
      updateDisplay();
    });
  }

  // Texture dropdown
  let textureSelect = select('#textureSelect');
  if (textureSelect) {
    textureSelect.changed(() => {
      defaults.texture = textureSelect.value();
      loadTexture(defaults.texture);
      setTimeout(updateDisplay, 100);
    });
  }

  // Default jitter controls
  let defaultJitterPixels = select('#defaultJitterPixels');
  if (defaultJitterPixels) {
    defaultJitterPixels.input(() => {
      defaults.jitterPixels = parseInt(defaultJitterPixels.value()) || 0;
      updateDisplay();
    });
  }

  let defaultJitterRotation = select('#defaultJitterRotation');
  if (defaultJitterRotation) {
    defaultJitterRotation.input(() => {
      defaults.jitterRotation = parseFloat(defaultJitterRotation.value()) || 0;
      updateDisplay();
    });
  }

  // Texture opacity control
  let textOpacity = select('#textOpacity');
  if (textOpacity) {
    textOpacity.input(() => {
      defaults.textOpacity = parseInt(textOpacity.value()) || 150;
      updateDisplay();
    });
  }

  // Text content control
  let textContent = select('#textContent');
  if (textContent) {
    textContent.input(() => {
      defaults.textContent = textContent.value();
      updateDisplay();
    });
  }

  // Text size control
  let textSize = select('#textSize');
  if (textSize) {
    textSize.input(() => {
      defaults.textSize = parseInt(textSize.value()) || 80;
      updateDisplay();
    });
  }

  // Text position controls
  let textX = select('#textX');
  if (textX) {
    textX.input(() => {
      defaults.textX = parseInt(textX.value()) || 50;
      updateDisplay();
    });
  }

  let textY = select('#textY');
  if (textY) {
    textY.input(() => {
      defaults.textY = parseInt(textY.value()) || 70;
      updateDisplay();
    });
  }

  // Image drag and drop
  let dropZone = select('#image-drop-zone');
  let imageInput = select('#imageInput');
  
  if (dropZone && imageInput) {
    // Click to select file
    dropZone.mousePressed(() => {
      imageInput.elt.click();
    });
    
    // Handle file selection
    imageInput.changed(() => {
      let file = imageInput.elt.files[0];
      if (file && file.type.startsWith('image/')) {
        loadUserImage(file);
      }
    });
    
    // Drag and drop handlers
    dropZone.elt.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.addClass('drag-over');
    });
    
    dropZone.elt.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.removeClass('drag-over');
    });
    
    dropZone.elt.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.removeClass('drag-over');
      
      let files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        loadUserImage(files[0]);
      }
    });
  }

  // Add layer button
  let addLayerBtn = select('#addLayerBtn');
  if (addLayerBtn) {
    addLayerBtn.mousePressed(() => {
      addLayer('blue', 'red');
      updateDisplay();
    });
  }

  // Buttons
  let regenerateBtn = select('#regenerate');
  if (regenerateBtn) {
    regenerateBtn.mousePressed(() => {
      updateDisplay();
    });
  }

  let exportBtn = select('#export');
  if (exportBtn) {
    exportBtn.mousePressed(() => {
      exportRiso();
    });
  }

  // Build initial layer UI
  rebuildLayerUI();
}

function loadUserImage(file) {
  let reader = new FileReader();
  reader.onload = (e) => {
    img = loadImage(e.target.result, () => {
      // Force complete refresh - clear all riso layers first
      clearRiso();
      
      // Calculate container size based on window dimensions
      let containerWidth = windowWidth * 0.6; // Middle section takes 60% of window width
      let containerHeight = windowHeight * 0.8; // Use 80% of window height
      
      // Calculate proper image size to fit within container
      let { displayWidth, displayHeight } = calculateImageSize(img, containerWidth, containerHeight);
      
      // Store the display dimensions for consistent use
      currentDisplaySize.width = displayWidth;
      currentDisplaySize.height = displayHeight;
      
      // Add padding for jitter
      let maxJitter = 20;
      let canvasWidth = displayWidth + (maxJitter * 4);
      let canvasHeight = displayHeight + (maxJitter * 4);
      
      resizeCanvas(canvasWidth, canvasHeight);
      
      // Force clear the canvas and riso layers again after resize
      clear();
      background(255);
      clearRiso();
      
      // Recreate all riso objects to ensure fresh state
      risoLayers.forEach(layer => {
        layer.risoObject = new Riso(layer.colorName);
      });
      
      // Update image info
      let imageInfo = select('.current-image-info small');
      if (imageInfo) {
        imageInfo.html(`Current: ${file.name}`);
      }
      
      // Force immediate redraw
      loop(); // Enable drawing
      updateDisplay();
      setTimeout(() => {
        updateDisplay(); // Second update to ensure everything is rendered
      }, 50);
    });
  };
  reader.readAsDataURL(file);
}

function updateDisplay() {
  // Convert string blend mode to p5 constant
  switch(defaults.blendMode) {
    case 'BLEND': riso_blend_mode = BLEND; break;
    case 'ADD': riso_blend_mode = ADD; break;
    case 'DARKEST': riso_blend_mode = DARKEST; break;
    case 'LIGHTEST': riso_blend_mode = LIGHTEST; break;
    case 'EXCLUSION': riso_blend_mode = EXCLUSION; break;
    case 'MULTIPLY': riso_blend_mode = MULTIPLY; break;
    case 'SCREEN': riso_blend_mode = SCREEN; break;
    case 'REPLACE': riso_blend_mode = REPLACE; break;
    case 'REMOVE': riso_blend_mode = REMOVE; break;
    case 'DIFFERENCE': riso_blend_mode = DIFFERENCE; break;
    case 'OVERLAY': riso_blend_mode = OVERLAY; break;
    case 'HARD_LIGHT': riso_blend_mode = HARD_LIGHT; break;
    case 'SOFT_LIGHT': riso_blend_mode = SOFT_LIGHT; break;
    case 'DODGE': riso_blend_mode = DODGE; break;
    case 'BURN': riso_blend_mode = BURN; break;
    default: riso_blend_mode = SCREEN;
  }
  
  // Force loop to ensure draw() is called
  loop();
  redraw();
}

function draw() {
  background(255);
  clearRiso();

  // Only proceed if we have valid display dimensions
  if (currentDisplaySize.width <= 0 || currentDisplaySize.height <= 0) {
    noLoop();
    return;
  }

  // Create text graphic with same dimensions as canvas for proper alignment
  let textGraphic = createGraphics(width, height);
  textGraphic.fill(0);
  textGraphic.textStyle(BOLD);
  textGraphic.textFont('Helvetica');
  textGraphic.textAlign(CENTER, CENTER);
  textGraphic.textSize(defaults.textSize);
  
  // Convert percentage positions to pixel coordinates
  let textXPos = (defaults.textX / 100) * width;
  let textYPos = (defaults.textY / 100) * height;
  textGraphic.text(defaults.textContent, textXPos, textYPos);

  // Process each layer
  risoLayers.forEach(layer => {
    let channelImage = extractRGBChannel(img, layer.channelType);
    let cutout = layer.hasTextCutout ? textGraphic : null;
    
    // Use custom jitter if enabled, otherwise use defaults
    let jitterPixels = layer.useCustomJitter ? layer.customJitterPixels : defaults.jitterPixels;
    let jitterRotationDegrees = layer.useCustomJitter ? layer.customJitterRotation : defaults.jitterRotation;
    
    applyRisoChannel(layer.risoObject, channelImage, jitterPixels, jitterRotationDegrees, cutout);
  });

  drawRiso();
  noLoop(); // Only redraw when controls change
}

function applyRisoChannel(risoColor, channelImage, jitterPixels, jitterRotationDegrees, cutout = null) {
  risoColor.imageMode(CENTER);
  
  // Convert degrees to radians
  let jitterRadians = radians(jitterRotationDegrees);
  
  // Generate random jitter values to use for both image and cutout
  let jitterX = random(-jitterPixels, jitterPixels);
  let jitterY = random(-jitterPixels, jitterPixels);
  let jitterRotation = random(-jitterRadians, jitterRadians);
  
  // Use the stored display dimensions for consistency
  let displayWidth = currentDisplaySize.width;
  let displayHeight = currentDisplaySize.height;
  
  // Apply jitter transformations and draw image first
  risoColor.push();
  risoColor.translate(width/2 + jitterX, height/2 + jitterY);
  risoColor.rotate(jitterRotation);
  risoColor.image(channelImage, 0, 0, displayWidth, displayHeight);
  risoColor.pop();
  
  // Apply texture that matches the jittered image
  if (texture && texture.width > 0) {
    // Create a cropped texture that matches the image dimensions
    let textureForImage = createGraphics(displayWidth, displayHeight);
    textureForImage.image(texture, 0, 0, displayWidth, displayHeight);
    
    // Apply the same jitter transformations to the cropped texture
    risoColor.push();
    risoColor.translate(width/2 + jitterX, height/2 + jitterY);
    risoColor.rotate(jitterRotation);
    risoColor.blendMode(riso_blend_mode);
    risoColor.tint(255, defaults.textOpacity);
    risoColor.image(textureForImage, 0, 0, displayWidth, displayHeight);
    risoColor.noTint();
    risoColor.blendMode(BLEND);
    risoColor.pop();
  }
  
  // Apply cutout with same jitter if provided
  if (cutout) {
    // Create a copy of the cutout graphic to avoid side effects
    let cutoutCopy = createGraphics(cutout.width, cutout.height);
    cutoutCopy.push();
    cutoutCopy.translate(jitterX, jitterY);
    cutoutCopy.rotate(jitterRotation);
    cutoutCopy.image(cutout, -jitterX, -jitterY);
    cutoutCopy.pop();
    
    risoColor.cutout(cutoutCopy);
  }
}

function extractRGBChannel(img, channel) {
  let channelImage = createGraphics(img.width, img.height);
  channelImage.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let index = (x + y * img.width) * 4;
      let channelValue = 0;
      
      switch(channel) {
        case 'red':
          channelValue = img.pixels[index];
          break;
        case 'green':
          channelValue = img.pixels[index + 1];
          break;
        case 'blue':
          channelValue = img.pixels[index + 2];
          break;
      }
      
      channelImage.pixels[index] = channelValue; // Red
      channelImage.pixels[index + 1] = channelValue; // Green
      channelImage.pixels[index + 2] = channelValue; // Blue
      channelImage.pixels[index + 3] = 255; // Alpha
    }
  }
  
  channelImage.updatePixels();
  return channelImage;
}
