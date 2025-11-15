let data;
let levels = ["D1","D2","D3","D4","D5","D6","D7","U","Unknown"];
let levelIndex = 0;
let currentLevel = levels[levelIndex];

let centerX, centerY;
let mapA, mapB;
let outerRadiusA, outerRadiusB;

let minLat, minLon, maxLat, maxLon;
let chartW, chartH;
let margin = 70;

let rectA, rectB;
let volcanoes = [];
let circOrder = [];

let hoverId = -1; 
let hitR;

let typeColors = {};
const defaultColors = [
  '#ffba08', '#faa307', '#f48c06', '#e85d04', '#dc2f02', 
  '#d00000', '#9d0208', '#6a040f', '#577590', '#A0522D',
  '#32CD32', '#FF4500', '#6A5ACD', '#FFD700', '#00CED1'
];

// ========= PALETTE DI COLORI VINTAGE/SEPIA =========//
const colors = {
  background: '#f5f1e8',
  darkBrown: '#2d2416',
  mediumBrown: '#5a4a3a',
  lightBrown: '#6b5d4f',
  accent: '#8B4513',
  orange: '#c67d4a',
  lightOrange: '#d4a574',
  cream: '#fff8e7',
  blue: '#4a7c9e'
};

const paperBG = '#f5f1e8';
const titleColor = '#2d2416';

const levelRanges = {
  'D1': '1964-now',
  'D2': '1900-1963', 
  'D3': '1800-1899',
  'D4': '1700-1799',
  'D5': '1500-1699',
  'D6': 'A.D. 1-1499',
  'D7': 'B.C.(Holocene)',
  'U': 'Undated, but probable Holocene eruption',
  'Unknown': 'Uncertain Holocene eruption'
};

let scaleFactor;
let glyphSpacing = 8;
let maxRings = 4;
let volcanoTypes = [];
let mappaImg;

function preload(){
  data = loadTable("detail.csv", "csv", "header");
  mappaImg = loadImage("../Image/mappa.png");
}

function setup(){
  createCanvas(windowWidth, windowHeight);
  
  extractVolcanoTypes();
  createColorPalette();
  
  scaleFactor = min(width / 1000, height / 820);
  
  calculateGeoBounds();
  calculateProportionalSizes();
  processData();
  computeTypeForLevel();

  textFont('Georgia');
}

function calculateGeoBounds() {
  let allLat = [];
  let allLon = [];

  for (let i = 0; i < data.getRowCount(); i++) {
    let lat = parseFloat(data.getString(i, "Latitude"));
    let lon = parseFloat(data.getString(i, "Longitude"));

    if (!isNaN(lat) && !isNaN(lon)) {
      allLat.push(lat);
      allLon.push(lon);
    }
  }

  if (allLat.length > 0 && allLon.length > 0) {
    minLat = min(allLat);
    maxLat = max(allLat);
    minLon = min(allLon);
    maxLon = max(allLon);
  } else {
    minLat = -90; maxLat = 90;
    minLon = -180; maxLon = 180;
  }
}

function extractVolcanoTypes() {
  let typeSet = new Set();
  
  for (let rowNumber = 0; rowNumber < data.getRowCount(); rowNumber++) {
    let type = data.getString(rowNumber, "TypeCategory");
    if (type && type.trim() !== "") {
      typeSet.add(type.trim());
    } else {
      typeSet.add('Other / Unknown');
    }
  }
  
  volcanoTypes = Array.from(typeSet).sort();
}

function createColorPalette() {
  if (!volcanoTypes.includes('Other / Unknown')) {
    volcanoTypes.push('Other / Unknown');
    volcanoTypes.sort();
  }
  
  for (let i = 0; i < volcanoTypes.length; i++) {
    typeColors[volcanoTypes[i]] = defaultColors[i % defaultColors.length];
  }
}

function calculateProportionalSizes(){
  centerX = width / 2;
  centerY = height / 2;
  
  mapA = 310 * scaleFactor;
  mapB = 180 * scaleFactor;
  outerRadiusA = mapA + 100 * scaleFactor;
  outerRadiusB = mapB + 100 * scaleFactor;
  
  rectA = 250 * scaleFactor;
  rectB = 112.5 * scaleFactor;
  
  chartW = rectA * 2;
  chartH = rectB * 2;
  
  margin = 70 * scaleFactor;
  hitR = 8 * scaleFactor;
  glyphSpacing = 8 * scaleFactor;
}

function processData(){
  let idCounter = 0;
  
  for (let level of levels) {
    let rows = data.findRows(level, "Last Known Eruption");
    processLevelData(rows, level, idCounter);
    idCounter += rows.length;
  }
}

function processLevelData(rows, level, startId){
  for (let i = 0; i < rows.length; i++){
    let row = rows[i];
    let type = row.get('TypeCategory') || 'Other / Unknown';
    
    let v = {
      id: startId + i,
      name: row.get('Volcano Name'),
      lat: parseFloat(row.get('Latitude')) || 0,
      lon: parseFloat(row.get('Longitude')) || 0,
      elev: parseFloat(row.get('Elevation (m)')) || null,
      type: type,
      LKE: level,
      country: row.get('Country') || '',
      xMap: 0, yMap: 0, theta: 0,
      ringIndex: 0
    };
    
    computeMapPos(v);
    volcanoes.push(v);
  }
}

function getCurrentVolcanoes(){
  return volcanoes.filter(v => v.LKE === currentLevel);
}

function computeMapPos(v){
  let x = map(v.lon, minLon, maxLon, -rectA, rectA);
  let y = map(v.lat, minLat, maxLat, rectB, -rectB);
  
  v.xMap = centerX + x;
  v.yMap = centerY + y;
}

function computeTypeForLevel() {
  let list = getCurrentVolcanoes();
  
  let grouped = {};
  for (let v of list){
    let k = v.type;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(v);
  }
  
  for (let k of Object.keys(grouped)) {
    grouped[k].sort((a,b) => a.name.localeCompare(b.name));
  }
  
  let preferredOrder = Object.keys(grouped).sort((a, b) => {
    return grouped[b].length - grouped[a].length;
  });
  
  circOrder = [];
  for (let k of preferredOrder){
    for (let v of grouped[k]) circOrder.push(v);
  }

  let N = circOrder.length;
  if (N === 0) return;

  let ringsCapacity = [];
  let totalCapacity = 0;
  
  for (let ring = 0; ring < maxRings; ring++) {
    let ringRadiusA = max(outerRadiusA - ring * 25 * scaleFactor, mapA + 30 * scaleFactor);
    let ringRadiusB = max(outerRadiusB - ring * 25 * scaleFactor, mapB + 30 * scaleFactor);
    
    let circumference = 2 * Math.PI * sqrt((ringRadiusA * ringRadiusA + ringRadiusB * ringRadiusB) / 2);
    let capacity = Math.floor(circumference / glyphSpacing);
    
    ringsCapacity.push(capacity);
    totalCapacity += capacity;
    
    if (totalCapacity >= N) break;
  }
  
  let currentRing = 0;
  let currentRingPosition = 0;
  
  for (let i = 0; i < N; i++) {
    if (currentRingPosition >= ringsCapacity[currentRing]) {
      currentRing++;
      currentRingPosition = 0;
      
      if (currentRing >= ringsCapacity.length) {
        currentRing = ringsCapacity.length - 1;
      }
    }
    
    circOrder[i].ringIndex = currentRing;
    currentRingPosition++;
  }

  for (let ring = 0; ring < ringsCapacity.length; ring++) {
    let ringVolcanoes = circOrder.filter(v => v.ringIndex === ring);
    let ringCount = ringVolcanoes.length;
    
    if (ringCount === 0) continue;
    
    let ringRadiusA = max(outerRadiusA - ring * 25 * scaleFactor, mapA + 30 * scaleFactor);
    let ringRadiusB = max(outerRadiusB - ring * 25 * scaleFactor, mapB + 30 * scaleFactor);
    
    let circumference = 2 * Math.PI * sqrt((ringRadiusA * ringRadiusA + ringRadiusB * ringRadiusB) / 2);
    let angleStep = (2 * Math.PI * glyphSpacing) / circumference;
    
    let startAngle = -HALF_PI;
    
    for (let i = 0; i < ringCount; i++) {
      let idx = circOrder.indexOf(ringVolcanoes[i]);
      circOrder[idx].theta = startAngle + i * angleStep;
    }
  }
}

function draw(){
  background(colors.background);
  
  // Aggiungo texture di carta sottile
  drawPaperTexture();
  
  drawTitle();
  drawEllipticalBackground();
  drawCentralRectangle();
  drawStartLine();
  updateHover();
  drawInnerPoints();
  drawCircumferenceAsterisks();
  drawCenterControls();
  drawLegend();
  drawInfoPanel();
  
  // Disegno ornamenti decorativi agli angoli della pagina
  drawCornerOrnaments();
}

function drawPaperTexture() {
  push();
  noStroke();
  // Creo punti casuali per simulare texture di carta
  for (let i = 0; i < 1000; i++) {
    fill(139, 69, 19, random(2, 8));
    circle(random(width), random(height), random(0.5, 2));
  }
  pop();
}

function drawCornerOrnaments() {
  push();
  stroke(colors.accent);
  strokeWeight(2);
  noFill();
  
  // Angolo superiore sinistro
  line(20, 20, 60, 20);
  line(20, 20, 20, 60);
  
  // Angolo superiore destro
  line(width - 20, 20, width - 60, 20);
  line(width - 20, 20, width - 20, 60);
  
  pop();
}

function drawEllipticalBackground() {
  push();
  translate(centerX, centerY);
  
  stroke('#d4c9b1');
  strokeWeight(3 * scaleFactor);
  fill(colors.cream);
  ellipse(0, 0, mapA*2 + 8 * scaleFactor, mapB*2 + 8 * scaleFactor);
  
  noFill();
  stroke(colors.mediumBrown);
  strokeWeight(1.5 * scaleFactor);
  ellipse(0, 0, mapA*2, mapB*2);
  
  stroke('#e8dfca');
  strokeWeight(0.8 * scaleFactor);
  line(-mapA, 0, mapA, 0);
  line(0, -mapB, 0, mapB);
  pop();
}

function drawStartLine() {
  push();
  stroke(colors.mediumBrown);
  strokeWeight(1 * scaleFactor);
  strokeCap(ROUND);
  
  let startX = centerX;
  let startY = centerY - mapB - 2 * scaleFactor;
  let endX = centerX;
  let endY = centerY - outerRadiusB - 10 * scaleFactor;
  
  line(startX, startY, endX, endY);
  
  fill(colors.accent);
  noStroke();
  ellipse(endX, endY, 3 * scaleFactor);
  pop();
}

function drawTitle(){
  push();
  textAlign(CENTER, CENTER);
  
  // Linea decorativa sopra il titolo
  drawDecorativeLine(centerX, 25 * scaleFactor, 200);
  
  // Titolo principale
  textFont('Georgia');
  textSize(24 * scaleFactor);
  fill(colors.darkBrown);
  noStroke();
  text('VULCANOES ERUPTION', centerX, 50 * scaleFactor);
  
  // Sottotitolo con periodo
  textSize(16 * scaleFactor);
  fill(colors.lightBrown);
  text(levelRanges[currentLevel], centerX, 80 * scaleFactor);
  
  pop();
}

function drawDecorativeLine(x, y, w) {
  push();
  stroke(colors.accent);
  strokeWeight(1);
  
  // Linea sinistra
  line(x - w, y, x - 20, y);
  
  // Rombi decorativi al centro
  fill(colors.accent);
  noStroke();
  push();
  translate(x - 10, y);
  rotate(PI / 4);
  rect(-2, -2, 4, 4);
  pop();
  
  push();
  translate(x, y);
  rotate(PI / 4);
  rect(-2, -2, 4, 4);
  pop();
  
  push();
  translate(x + 10, y);
  rotate(PI / 4);
  rect(-2, -2, 4, 4);
  pop();
  
  // Linea destra
  stroke(colors.accent);
  strokeWeight(1);
  line(x + 20, y, x + w, y);
  
  pop();
}

function drawCentralRectangle(){
  push();
  translate(centerX, centerY);

  if (mappaImg) {
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(-rectA, -rectB*5, rectA*4, rectB*10);
    drawingContext.clip();
    
    imageMode(CENTER);
    image(mappaImg, 4, -16.9, rectA*2.1, rectB*2);
    
    drawingContext.restore();
  }
  pop();
}

function drawInnerPoints(){
  let currentVolcanoes = getCurrentVolcanoes();
  
  for (let v of currentVolcanoes) {
    drawInnerPoint(v);
  }
}

function drawInnerPoint(v){
  let isHovered = (hoverId === v.id);
  let pointColor = (v.elev !== null && v.elev < 0) ? color(colors.blue) : color(colors.orange);

  push();
  noStroke();
  
  if (isHovered) {
    fill(colors.accent);
    ellipse(v.xMap, v.yMap, 12 * scaleFactor);
  } else {
    fill(pointColor);
    ellipse(v.xMap, v.yMap, 6 * scaleFactor);
  }
  pop();
}

function drawGliphs(x, y, size, col, isHovered) {
  push();
  translate(x, y);
  noStroke();
  
  if (isHovered) {
    fill(colors.accent);
    square(-size/1.5, -size/1.5, size * 1.5);
  } else {
    fill(col);
    square(-size/2, -size/2, size);
  }
  pop();
}

function drawCircumferenceAsterisks(){
  let glyphSize = 4 * scaleFactor;

  for (let i = 0; i < circOrder.length; i++){
    let v = circOrder[i];
    let col = colorForType(v.type);
    let isHovered = (hoverId === v.id);

    let ringRadiusA = max(outerRadiusA - v.ringIndex * 25 * scaleFactor, mapA + 30 * scaleFactor);
    let ringRadiusB = max(outerRadiusB - v.ringIndex * 25 * scaleFactor, mapB + 30 * scaleFactor);
    
    let x = centerX + cos(v.theta) * ringRadiusA;
    let y = centerY + sin(v.theta) * ringRadiusB;

    drawGliphs(x, y, glyphSize, col, isHovered);

    if (isHovered) {
      push();
      stroke(colors.accent);
      strokeWeight(1 * scaleFactor);
      line(x, y, v.xMap, v.yMap);
      pop();
    }
  }
}

function drawCenterControls(){
  let btnW = 400 * scaleFactor;
  let btnH = 200 * scaleFactor;
  let bx = centerX - btnW/2;
  let by = centerY + mapB + 50 * scaleFactor;
  
  let isHovered = (mouseX > bx && mouseX < bx + btnW && mouseY > by && mouseY < by + btnH);
  
  push();
  textAlign(CENTER, CENTER);
  textSize(14 * scaleFactor);
  
  if (isHovered) {
    fill(colors.accent);
  } else {
    fill(colors.darkBrown);
  }
  
  drawInteractiveArrows(centerX, by + btnH/2, isHovered);
  pop();
}

function drawInteractiveArrows(x, y, isHovered) {
  push();
  textAlign(CENTER, CENTER);
  textSize(14 * scaleFactor);
  
  if (isHovered) {
    fill(colors.accent);
  } else {
    fill(colors.darkBrown);
  }
  
  let leftArrowX = x - 180 * scaleFactor;
  let rightArrowX = x + 180 * scaleFactor;
  
  text("⮜", leftArrowX, y);
  text("Click the arrow to explore the eruption timeline", x, y);
  text("⮞", rightArrowX, y);
  pop();
}

function drawLegend(){
  let typeCount = volcanoTypes.length;
  let baseHeight = 350;
  let h = (baseHeight + (max(0, typeCount - 10) * 22)) * scaleFactor;
  
  let w = 220 * scaleFactor;
  let x = 30 * scaleFactor;
  let y = 120 * scaleFactor;
  
  push();
  // Sfondo della legenda con stile vintage
  fill(255);
  stroke(colors.mediumBrown);
  strokeWeight(2);
  rect(x, y, w, h, 2);
  
  // Angoli decorativi
  drawCardCorners(x, y, w, h);
  
  // Titolo legenda esterna
  noStroke();
  fill(colors.darkBrown);
  textSize(14 * scaleFactor);
  textAlign(CENTER, TOP);
  textFont('Georgia');
  textStyle(BOLD);
  
  // Punti decorativi sopra il titolo
  fill(colors.accent);
  let titleY = y + 15 * scaleFactor;
  circle(x + w/2 - 10, titleY, 3);
  circle(x + w/2, titleY, 3);
  circle(x + w/2 + 10, titleY, 3);
  
  fill(colors.darkBrown);
  text('LEGENDA ESTERNA', x + 110 * scaleFactor, y + 25 * scaleFactor);
  
  textStyle(NORMAL);
  
  // Lista tipi di vulcani
  for (let i = 0; i < volcanoTypes.length; i++){
    let type = volcanoTypes[i];
    let yy = y + 55 * scaleFactor + i * 22 * scaleFactor;
    drawGliphs(x + 15 * scaleFactor, yy + 4 * scaleFactor, 4 * scaleFactor, colorForType(type), false);
    fill(colors.darkBrown);
    noStroke ();
    textSize(9 * scaleFactor);
    textAlign(LEFT, CENTER);
    text(type, x + 30 * scaleFactor, yy + 4 * scaleFactor);
  }
  
  // Titolo legenda interna
  textSize(14 * scaleFactor);
  textStyle(BOLD);
  let internalLegendY = y + 55 * scaleFactor + volcanoTypes.length * 22 * scaleFactor + 15 * scaleFactor;
  
  textAlign(CENTER);
  fill(colors.darkBrown);
  text('LEGENDA INTERNA', x + 110 * scaleFactor, internalLegendY + 1 * scaleFactor);
  
  textAlign(LEFT);
  textStyle(NORMAL);
  
  // Legenda punti terrestri
  fill(colors.orange); 
  noStroke();
  ellipse(x + 15 * scaleFactor, internalLegendY + 25 * scaleFactor, 6 * scaleFactor);
  fill(colors.darkBrown); 
  textSize(10 * scaleFactor);
  text('Terrestre (elev ≥ 0)', x + 30 * scaleFactor, internalLegendY + 25 * scaleFactor);
  
  // Legenda punti sottomarini
  fill(colors.blue); 
  ellipse(x + 15 * scaleFactor, internalLegendY + 45 * scaleFactor, 6 * scaleFactor);
  fill(colors.darkBrown); 
  text('Sottomarino (elev < 0)', x + 30 * scaleFactor, internalLegendY + 45 * scaleFactor);
  
  // Punti decorativi in fondo
  fill(colors.accent);
  let bottomY = y + h - 15 * scaleFactor;
  circle(x + w/2 - 8, bottomY, 3);
  circle(x + w/2, bottomY, 3);
  circle(x + w/2 + 8, bottomY, 3);
  
  pop();
}

function drawCardCorners(x, y, w, h) {
  push();
  stroke(colors.orange);
  strokeWeight(2);
  noFill();
  
  // Angolo superiore sinistro
  line(x, y, x + 12, y);
  line(x, y, x, y + 12);
  
  // Angolo superiore destro
  line(x + w, y, x + w - 12, y);
  line(x + w, y, x + w, y + 12);
  
  // Angolo inferiore sinistro
  line(x, y + h, x + 12, y + h);
  line(x, y + h, x, y + h - 12);
  
  // Angolo inferiore destro
  line(x + w, y + h, x + w - 12, y + h);
  line(x + w, y + h, x + w, y + h - 12);
  
  pop();
}

function drawInfoPanel(){
  let w = 300 * scaleFactor;
  let h = 180 * scaleFactor;
  let x = width - w - 30 * scaleFactor;
  let y = 120 * scaleFactor;
  
  if (hoverId >= 0){
    push();
    // Sfondo del pannello info con stile vintage
    fill(255);
    stroke(colors.mediumBrown);
    strokeWeight(2);
    rect(x, y, w, h, 2);
    
    // Angoli decorativi
    drawCardCorners(x, y, w, h);
    
    // Titolo del pannello
    noStroke();
    fill(colors.darkBrown);
    textSize(14 * scaleFactor);
    textAlign(LEFT, TOP);
    textFont('Georgia');
    textStyle(BOLD);
    
    // Punti decorativi sopra il titolo
    fill(colors.accent);
    let panelTitleY = y + 15 * scaleFactor;
    circle(x + w/2 - 10, panelTitleY, 3);
    circle(x + w/2, panelTitleY, 3);
    circle(x + w/2 + 10, panelTitleY, 3);
    
    fill(colors.darkBrown);
    textAlign(CENTER, TOP)
    text('VOLCANO DETAILS', x + 150 * scaleFactor, y + 25 * scaleFactor);
    

    let v = volcanoes[hoverId];
    noStroke();
    textAlign(LEFT);
    textSize(13 * scaleFactor);
    textStyle(BOLD);
    text(v.name, x + 22 * scaleFactor, y + 55 * scaleFactor);
    textStyle(NORMAL);
    textSize(11 * scaleFactor);
    text('Paese: ' + (v.country || '—'), x + 22 * scaleFactor, y + 75 * scaleFactor);
    text('Tipo: ' + v.type, x + 22 * scaleFactor, y + 95 * scaleFactor);
    text('Altitudine: ' + (v.elev === null ? '—' : v.elev + ' m'), x + 22 * scaleFactor, y + 115 * scaleFactor);
    text('Coordinate: ' + nf(v.lat,1,2) + ', ' + nf(v.lon,1,2), x + 22 * scaleFactor, y + 135 * scaleFactor);
    
    // Punti decorativi in fondo
    fill(colors.accent);
    let bottomY = y + h - 15 * scaleFactor;
    circle(x + w/2 - 8, bottomY, 3);
    circle(x + w/2, bottomY, 3);
    circle(x + w/2 + 8, bottomY, 3);
  }
  pop();
}

function updateHover(){
  hoverId = -1;
  
  for (let i = 0; i < circOrder.length; i++){
    let v = circOrder[i];
    
    let ringRadiusA = max(outerRadiusA - v.ringIndex * 25 * scaleFactor, mapA + 30 * scaleFactor);
    let ringRadiusB = max(outerRadiusB - v.ringIndex * 25 * scaleFactor, mapB + 30 * scaleFactor);
    
    let x = centerX + cos(v.theta) * ringRadiusA;
    let y = centerY + sin(v.theta) * ringRadiusB;
    
    if (dist(mouseX, mouseY, x, y) < max(hitR, 8 * scaleFactor)) { 
      hoverId = v.id; 
      return; 
    }
  }
  
  let currentVolcanoes = getCurrentVolcanoes();
  for (let v of currentVolcanoes){
    if (dist(mouseX, mouseY, v.xMap, v.yMap) < max(hitR, 8 * scaleFactor)) { 
      hoverId = v.id; 
      return; 
    }
  }
}

function mousePressed(){
   // Controlla se è stato cliccato un vulcano
  if (hoverId >= 0) {
    let hovered = volcanoes[hoverId];
    // Usa il nome invece dell'ID
    let myUrl = "Detail.html?name=" + encodeURIComponent(hovered.name);
    window.location.href = myUrl;
    return;
  }
  
  // Codice esistente per le frecce
  let btnW = 400 * scaleFactor;
  let btnH = 200 * scaleFactor;
  let bx = centerX - btnW/2;
  let by = centerY + mapB + 50 * scaleFactor;
  
  if (mouseX > bx && mouseX < bx + btnW && mouseY > by && mouseY < by + btnH) { 
    let centerTextX = centerX;
    let leftArrowX = centerTextX - 180 * scaleFactor;
    let rightArrowX = centerTextX + 180 * scaleFactor;
    let arrowY = by + btnH/2;
    
    if (dist(mouseX, mouseY, leftArrowX, arrowY) < 20 * scaleFactor) {
      cycleLevel(-1);
    }
    else if (dist(mouseX, mouseY, rightArrowX, arrowY) < 20 * scaleFactor) {
      cycleLevel(1);
    }
  }
}

function keyPressed(){
  if (keyCode === RIGHT_ARROW) cycleLevel(1);
  else if (keyCode === LEFT_ARROW) cycleLevel(-1);
}

function cycleLevel(dir){
  levelIndex = (levelIndex + dir + levels.length) % levels.length;
  currentLevel = levels[levelIndex];
  computeTypeForLevel();
}

function colorForType(t){ 
  return typeColors[t] || typeColors['Other / Unknown'] || '#7F7F7F'; 
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  
  scaleFactor = min(width / 1280, height / 720);
  
  calculateProportionalSizes();
  
  for (let v of volcanoes) computeMapPos(v);
  computeTypeForLevel();
}