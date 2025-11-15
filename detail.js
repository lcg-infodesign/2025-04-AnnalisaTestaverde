let data;
let maxElevationGlobal = 0; // Calcolato dinamicamente in preload() -> lo calcoliamo dopo
let levels = ["D1","D2","D3","D4","D5","D6","D7","U","Unknown"];

// Definizione degli intervalli temporali per ogni codice di eruzione
// Ogni codice (D1, D2, etc.) corrisponde a un periodo storico specifico
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

let backButton;
let volcanoImages = {}; // OGGETTO VUOTO DOVE METTERO LE IMMAGINI -> chiave: nome tipo vulcano, valore: immagine

// Palette di colori vintage/sepia per l'interfaccia
// Definisco tutti i colori che userò in un oggetto così sono organizzati
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

// Mappatura delle categorie del dataset ai nomi delle immagini
// Serve per associare ogni tipo di vulcano all'immagine corretta
// Se nel dataset c'è "Caldera" -> uso l'immagine 'Caldera.png'
const categoryToImageMap = {
  'Caldera': 'Caldera',
  'Cone': 'Cone',
  'Crater System': 'CraterSystem',
  'Shield volcano': 'Shield',
  'Shield Volcano': 'Shield',
  'Stratovolcano': 'Stratovolcano',
  'Subglacial': 'Subglacial',
  'Submarine volcano': 'Submarine',
  'Submarine Volcano': 'Submarine',
  'Maars / Tuff ring': 'Tuffring',
  'Maars': 'Tuffring',
  'Tuff ring': 'Tuffring',
  'Other / Unknown': 'Unknown',
  'Unknown': 'Unknown',
  'Complex volcano': 'Stratovolcano',
  'Lava dome': 'Cone',
  'Pyroclastic cone': 'Cone',
  'Volcanic field': 'Cone'
};

function preload() {
  // Carico il file CSV con i dati dei vulcani
  // "header" indica che la prima riga contiene i nomi delle colonne
  data = loadTable("detail.csv", "csv", "header");
  
  // Precarico tutte le immagini dei tipi di vulcano
  // Ogni immagine viene associata a una chiave nell'oggetto volcanoImages
  // Questo mi serve per avere tutte le immagini pronte quando le devo usare
  volcanoImages['Caldera'] = loadImage("../Image/Caldera.png");
  volcanoImages['Cone'] = loadImage("../Image/Cone.png");
  volcanoImages['CraterSystem'] = loadImage("../Image/CraterSystem.png");
  volcanoImages['Shield'] = loadImage("../Image/Shield.png");
  volcanoImages['Stratovolcano'] = loadImage("../Image/stratovolcano.png");
  volcanoImages['Subglacial'] = loadImage("../Image/Subglacial.png");
  volcanoImages['Submarine'] = loadImage("../Image/Submarine.png");
  volcanoImages['Tuffring'] = loadImage("../Image/Tuffring.png");
  volcanoImages['Unknown'] = loadImage("../Image/Unknown.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Roboto"); // IMPOSTO IL FONT DI BASE PER TUTTO IL TESTO
  
  // Creo il pulsante per tornare indietro
  backButton = createButton('← Back');
  backButton.position(30, 30);
  // STYLING DEL PULSANTE -> gli do un aspetto vintage che si abbini al resto
  backButton.style('font-family', 'Georgia, serif');
  backButton.style('font-size', '16px');
  backButton.style('padding', '10px 16px');
  backButton.style('background-color', 'white');
  backButton.style('color', colors.mediumBrown);
  backButton.style('border', '2px solid ' + colors.mediumBrown);
  backButton.style('border-radius', '2px');
  backButton.style('cursor', 'pointer');
  backButton.style('box-shadow', '2px 2px 0px rgba(90,74,58,0.3)');
  backButton.mousePressed(handleBack); // QUANDO CLICCO CHIAMA handleBack
  
  noLoop(); // Disegno solo una volta, non in continuo -> perché i dati non cambiano in tempo reale
}

function draw() {
  // Sfondo principale
  background(colors.background);
  
  // Aggiungo texture di carta sottile per effetto vintage
  // Simula la grana della carta vecchia
  drawPaperTexture();
  
  // Disegno ornamenti decorativi agli angoli
  // Quelle linee decorative negli angoli dello schermo
  drawCornerOrnaments();

  // Ottengo i parametri dall'URL (es: ?name=Etna)
  // Se nell'URL c'è ?name=Etna, parameters conterrà {name: "Etna"}
  let parameters = getURLParams();
  console.log("URL Parameters:", parameters);
  
  // MODIFICA: Cerco il vulcano per NOME invece che per ID
  // Prima cercavo per ID, ora cerco direttamente per il nome che arriva dall'URL
  let selected = findVolcanoByName(parameters.name);
  
  // Se non trovo il vulcano, uso un default (primo vulcano nel dataset)
  // Questo è un fallback per evitare errori se il nome non viene trovato
  if (!selected) {
    console.log("Volcano not found with name:", parameters.name, "using default");
    selected = data.getRow(0); // fallback al primo vulcano
  } else {
    console.log("Found volcano:", selected.getString("Volcano Name"));
  }

  // Descrizioni per ogni stato possibile del vulcano
  // Ogni stato ha una descrizione dettagliata che spiega cosa significa
  const statusDescriptions = {
    "Historical": "Eruption documented during or immediately after human observation.",
    "Hydrophonic": "Volcanic activity detected via hydrophones (submarine acoustic monitoring), typical of submarine eruptions.",
    "Dated eruptions": "Eruption dating through geochronological techniques (e.g., radiocarbon, argon-argon, tephrochronology, lichenometry, etc.).",
    "Thermal features": "Presence of thermal manifestations (e.g., fumaroles) without documented explosive or effusive eruptions.",
    "Uncertain": "Uncertain status: insufficient data to determine with certainty if volcanic activity occurred in the Holocene period.",
    "Pleistocene": "The last eruption occurred in the Pleistocene period (approx. 2.6 million - 11,700 years ago).",
    "Holocene": "The last eruption occurred in the Holocene period (last ~11,700 years), but is not historically documented.",
    "Fumarolic": "Presence of fumarolic phenomena (hot gas emissions) without documented explosive or effusive eruptions.",
    "Unknown": "Unknown status: lack of information or insufficient data to classify the volcano's status."
  };

  // ========= CALCOLO LAYOUT RESPONSIVE =========//
  // Calcolo layout responsive basato sulle dimensioni della finestra
  // Uso percentuali così si adatta a qualsiasi dimensione dello schermo
  let margin = width * 0.08;
  let contentWidth = width - margin * 2;
  
  // Sezione titolo
  // Disegno il titolo principale con nome vulcano e posizione
  drawTitle(selected.getString("Volcano Name"), width / 2, height * 0.15, selected);
  
  // Contenuto principale - tre colonne
  // Divido lo spazio in tre colonne per organizzare le informazioni
  let colWidth = contentWidth / 3.5;
  let startY = height * 0.2;
  let contentHeight = height * 0.7;
  
  // Colonna sinistra: grafico dell'elevazione
  // Mostra dove si posiziona questo vulcano rispetto a tutti gli altri in termini di altezza
  drawElevationChart(margin, startY, colWidth * 0.85, contentHeight, selected);
  
  // Colonna centrale: card con illustrazione del vulcano
  // Card con immagine del tipo di vulcano e informazioni sull'ultima eruzione
  let centerX = margin + colWidth;
  drawVolcanoCard(centerX, startY, colWidth, contentHeight, selected);
  
  // Colonna destra: pannelli informativi
  // Informazioni dettagliate sul tipo e stato del vulcano
  let rightX = centerX + colWidth + colWidth * 0.15;
  let rightWidth = contentWidth - (rightX - margin);
  drawInfoPanels(rightX, startY, rightWidth, contentHeight, selected, statusDescriptions);
  
  // Footer
  // Crediti e fonte dati in fondo alla pagina
  drawFooter(width / 2, height - 30);
}

function findVolcanoByName(name) {
  console.log("findVolcanoByName called with:", name);
  
  // Controllo se è stato fornito un nome
  if (!name) {
    console.log("No name provided");
    return null;
  }
  
  // Decodifico il nome (potrebbe avere spazi convertiti in + nell'URL)
  // Se nell'URL c'è "Mount+St+Helens" -> diventa "Mount St Helens"
  let decodedName = decodeURIComponent(name);
  console.log("Decoded name:", decodedName);
  
  // Cerco il vulcano per nome nel CSV
  // Scorro tutte le righe del dataset per trovare quella con il nome che corrisponde
  for (let i = 0; i < data.getRowCount(); i++) {
    let row = data.getRow(i);
    let volcanoName = row.getString("Volcano Name");
    
    // Confronto i nomi in lowercase per evitare problemi di maiuscole/minuscole
    if (volcanoName && volcanoName.toLowerCase() === decodedName.toLowerCase()) {
      console.log("Found volcano at index:", i, "Name:", volcanoName);
      return row; // TROVATO! Restituisco la riga con i dati del vulcano
    }
  }
  
  console.log("Volcano not found with name:", decodedName);
  return null; // Non trovato
}

// Funzione per ottenere l'immagine corretta in base alla categoria del vulcano
function getVolcanoImage(typeCategory) {
  // Pulisco e normalizzo il nome della categoria
  // Rimuovo spazi extra all'inizio e alla fine
  let cleanCategory = typeCategory.trim();
  
  // Cerco nella mappatura
  // Se "Caldera" -> imageKey = "Caldera"
  let imageKey = categoryToImageMap[cleanCategory];
  
  // Se ho trovato una mappatura E ho l'immagine corrispondente
  if (imageKey && volcanoImages[imageKey]) {
    console.log("Found image for category:", cleanCategory, "->", imageKey);
    return volcanoImages[imageKey];
  } else {
    // Se non trovo una mappatura specifica, uso Unknown
    console.log("No specific image found for category:", cleanCategory, "using Unknown");
    return volcanoImages['Unknown'];
  }
}

function drawPaperTexture() {
  push();
  noStroke();
  // Creo punti casuali per simulare texture di carta
  // Tanti piccoli punti marroni trasparenti che sembrano macchie su carta vecchia
  for (let i = 0; i < 1000; i++) {
    fill(139, 69, 19, random(2, 8)); // Marrone con trasparenza casuale
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
  // Due linee che formano un angolo di 90 gradi
  line(20, 20, 60, 20);
  line(20, 20, 20, 60);
  
  // Angolo superiore destro
  line(width - 20, 20, width - 60, 20);
  line(width - 20, 20, width - 20, 60);
  
  pop();
}

function drawTitle(volcanoName, x, y, selected) {
  push();
  textAlign(CENTER, CENTER);
  
  // Linea decorativa sopra il titolo
  // Quella linea con i rombi che vediamo sopra il nome
  drawDecorativeLine(x, y - 90, 150);
  
  // Titolo principale
  textFont('Georgia');
  textSize(width * 0.045);
  fill(colors.darkBrown);
  text(volcanoName, x, y - 50);
  
  // Informazioni sulla posizione
  // Paese e coordinate geografiche
  textSize(width * 0.012);
  fill(colors.lightBrown);
  noStroke();
  text(selected.getString("Country") + " · " + selected.getNum("Latitude") + "°, " + selected.getNum("Longitude") + "°", x, y -10);
  
  // Linea decorativa sotto il titolo
  drawDecorativeLine(x, y + 15, 150);
  
  pop();
}

function drawDecorativeLine(x, y, w) {
  push();
  stroke(colors.accent);
  strokeWeight(1);
  
  // Linea sinistra
  // Parte sinistra della linea decorativa
  line(x - w, y, x - 20, y);
  
  // Rombi decorativi al centro
  // Quei tre quadrati ruotati che sembrano rombi
  fill(colors.accent);
  noStroke();
  push();
  translate(x - 10, y);
  rotate(PI / 4); // Ruoto di 45 gradi per fare il rombo
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

function drawElevationChart(x, y, w, h, selected) {
  push();
  
  // Sfondo della card
  fill(255);
  stroke(colors.mediumBrown);
  strokeWeight(2);
  rect(x, y, w, h, 2); // Rettangolo con angoli arrotondati
  
  // Angoli decorativi
  // Quelle linee decorative negli angoli della card
  drawCardCorners(x, y, w, h);
  
  // Titolo
  textAlign(CENTER, CENTER);
  textFont('Georgia');
  textSize(w * 0.12);
  fill(colors.darkBrown);
  noStroke();
  
  // Punti decorativi
  // I tre punti sopra la parola "Elevation"
  fill(colors.accent);
  let dotY = y + h * 0.08;
  circle(x + w/2 - 10, dotY, 3);
  circle(x + w/2, dotY, 3);
  circle(x + w/2 + 10, dotY, 3);
  
  text("Elevation", x + w/2, y + h * 0.13);
  
  // Linea decorativa sotto il titolo
  stroke(colors.accent);
  strokeWeight(1);
  line(x + w/2 - 30, y + h * 0.16, x + w/2 + 30, y + h * 0.16);
  
  // ========= OTTENGO I DATI DI ELEVAZIONE DAL CSV =========//
  // Ottengo i dati di elevazione dal CSV
  let elevColumnRaw = data.getColumn("Elevation (m)");
  // Converto in numeri e rimuovo i valori non validi
  let elevValues = elevColumnRaw.map(v => Number(v)).filter(v => !isNaN(v));
  
  // Calcolo min e max di tutti i vulcani
  let colMin = elevValues.length ? Math.min(...elevValues) : 0;
  let colMax = elevValues.length ? Math.max(...elevValues) : 1;
  let volcanoElev = selected.getNum("Elevation (m)"); // Elevazione del vulcano selezionato
  
  // ========= DISEGNO IL TRIANGOLO DELLA MONTAGNA =========//
  // Triangolo della montagna
  let chartX = x + w/2.4;
  let chartTop = y + h * 0.22;
  let chartBottom = y + h * 0.72;
  let chartHeight = chartBottom - chartTop;
  let chartWidth = w * 0.5;
  
  // Calcolo la posizione corrente del vulcano
  // MAP: trasformo l'elevazione in una posizione verticale nel grafico
  let range = colMax - colMin;
  let currentRatio = (volcanoElev - colMin) / range;
  let currentY = chartBottom - (currentRatio * chartHeight);
  
  noStroke();
  
  // Porzione riempita (effetto gradiente con rettangoli multipli)
  // Creo tanti rettangoli sottili uno sopra l'altro per fare un gradiente
  for (let i = currentY; i < chartBottom; i += 2) {
    let progress = (i - currentY) / (chartBottom - currentY);
    let alpha = map(progress, 0, 1, 100, 150); // Alpha aumenta verso il basso
    fill(212, 165, 116, alpha); // Colore arancione chiaro
    
    // Calcolo la larghezza del triangolo a questa altezza
    // Più in alto è più stretto, più in basso è più largo
    let heightRatio = (i - chartTop) / chartHeight;
    let currentWidth = heightRatio * chartWidth;
    let leftX = chartX - currentWidth/2;
    let rightX = chartX + currentWidth/2;
    
    rect(leftX, i, rightX - leftX, 2); // Rettangolo spesso 2px
  }
  
  // Contorno della montagna
  stroke(colors.accent);
  strokeWeight(2);
  noFill();
  triangle(
    chartX, chartTop,           // Vertice in alto
    chartX - chartWidth/2, chartBottom, // Vertice in basso a sinistra  
    chartX + chartWidth/2, chartBottom  // Vertice in basso a destra
  );
  
  // Linea dell'elevazione corrente
  // Linea tratteggiata che mostra dove si trova questo vulcano
  stroke(colors.accent);
  strokeWeight(2);
  drawingContext.setLineDash([4, 4]); // Linea tratteggiata
  line(chartX - chartWidth/2 - 10, currentY, chartX + chartWidth/2 + 10, currentY);
  drawingContext.setLineDash([]); // Ripristino linea normale
  
  // Punto dell'elevazione corrente
  // Cerchietto arancione sulla linea tratteggiata
  fill(colors.orange);
  stroke(colors.mediumBrown);
  strokeWeight(1.5);
  circle(chartX, currentY, 8);
  
  // Linea del livello del mare (se applicabile)
  // Solo se ci sono vulcani sotto il livello del mare
  if (colMin <= 0 && colMax >= 0) {
    let seaLevelRatio = (0 - colMin) / range;
    let seaLevelY = chartBottom - (seaLevelRatio * chartHeight);
    stroke(colors.blue);
    strokeWeight(1.5);
    drawingContext.setLineDash([6, 3]);
    line(chartX - chartWidth/2 - 10, seaLevelY, chartX + chartWidth/2 + 10, seaLevelY);
    drawingContext.setLineDash([]);
    
    // Etichetta del livello del mare
    textSize(w * 0.06);
    fill(colors.blue);
    noStroke();
    textAlign(LEFT, CENTER);
    text("sea level", chartX + chartWidth/2 + 15, seaLevelY);
  }
  
  // Etichette
  textFont('Georgia');
  textSize(w * 0.06);
  textAlign(RIGHT, CENTER);
  fill(colors.mediumBrown);
  noStroke();
  text(colMax.toLocaleString() + "m", chartX + chartWidth/2, chartTop); // Massimo in alto
  text(colMin.toLocaleString() + "m", chartX + chartWidth/2 + 70, chartBottom); // Minimo in basso
  
  // Etichetta dell'elevazione corrente
  fill(colors.accent);
  stroke(colors.accent);
  strokeWeight(1);
  fill(colors.cream);
  rect(chartX + chartWidth/2 + 5, currentY - 12, 70, 24, 2); // Sfondo per il testo
  fill(colors.accent);
  noStroke();
  textAlign(CENTER, CENTER);
  text(volcanoElev.toLocaleString() + "m", chartX + chartWidth/2 + 40, currentY);
  
  // ========= STATISTICHE IN FONDO =========//
  // Statistiche in fondo
  let statsY = y + h * 0.78;
  textSize(w * 0.055);
  textAlign(LEFT, CENTER);
  
  // Vulcano più alto
  stroke(colors.mediumBrown);
  strokeWeight(1);
  drawingContext.setLineDash([3, 3]);
  line(x + w * 0.1, statsY, x + w * 0.9, statsY);
  line(x + w * 0.1, statsY + 25, x + w * 0.9, statsY + 25);
  drawingContext.setLineDash([]);
  
  fill(colors.lightBrown);
  noStroke();
  text("Highest volcano", x + w * 0.12, statsY + 12);
  fill(colors.accent);
  textAlign(RIGHT);
  text(colMax.toLocaleString() + " m", x + w * 0.88, statsY + 12);
  
  // Vulcano più basso
  statsY += 35;
  stroke(colors.mediumBrown);
  strokeWeight(1);
  drawingContext.setLineDash([3, 3]);
  line(x + w * 0.1, statsY + 25, x + w * 0.9, statsY + 25);
  drawingContext.setLineDash([]);
  
  fill(colors.lightBrown);
  noStroke();
  textAlign(LEFT);
  text("Lowest volcano", x + w * 0.12, statsY + 12);
  fill(colors.accent);
  textAlign(RIGHT);
  text(colMin.toLocaleString() + " m", x + w * 0.88, statsY + 12);
  
  // Vulcano corrente
  statsY += 40;
  fill(colors.cream);
  stroke(colors.orange);
  strokeWeight(1);
  rect(x + w * 0.1, statsY-5, w * 0.8, 30, 2); // Riquadro evidenziato
  
  fill(colors.mediumBrown);
  noStroke();
  textAlign(LEFT);
  text("Current volcano", x + w * 0.12, statsY + 10);
  fill(colors.accent);
  textAlign(RIGHT);
  text(volcanoElev.toLocaleString() + " m", x + w * 0.88, statsY + 10);
  
  pop();
}

function drawVolcanoCard(x, y, w, h, selected) {
  push();
  
  // Sfondo della card
  fill(255);
  stroke(colors.mediumBrown);
  strokeWeight(2);
  rect(x, y, w , h, 2);
  
  // Angoli decorativi
  drawCardCorners(x, y, w, h);
  
  // Header - Ultima eruzione conosciuta
  fill(colors.cream);
  rect(x, y, w, h * 0.12, 2, 2, 0, 0); // Solo angoli superiori arrotondati
  
  // Linea decorativa dell'header
  stroke(colors.mediumBrown);
  strokeWeight(2);
  line(x, y + h * 0.12, x + w, y + h * 0.12);
  
  // Ticchetti decorativi piccoli
  // Quelle lineette verticali sotto l'header
  strokeWeight(1);
  for (let i = 0; i < 20; i++) {
    line(x + (i * w/20), y + h * 0.12, x + (i * w/20), y + h * 0.12 + 3);
  }
  
  // Punti decorativi nell'header
  fill(colors.accent);
  noStroke();
  let headerY = y + h * 0.025;
  circle(x + w/2 - 6, headerY, 3);
  circle(x + w/2, headerY, 3);
  circle(x + w/2 + 6, headerY, 3);
  
  // Testo dell'header
  textFont('Georgia');
  textAlign(CENTER, CENTER);
  textSize(w * 0.035);
  fill(colors.lightBrown);
  text("Last Known Eruption", x + w/2, y + h * 0.06);
  
  // Ottengo e formattazione dell'ultima eruzione
  let lastEruptionCode = selected.getString("Last Known Eruption");
  let eruptionDisplay = levelRanges[lastEruptionCode] ? 
                       `${levelRanges[lastEruptionCode]} [${lastEruptionCode}]` : 
                       lastEruptionCode;
  textSize(w * 0.045);
  fill(colors.accent);
  text(eruptionDisplay, x + w/2, y + h * 0.095);
  
  // Area dell'immagine del vulcano
  let imageY = y + h * 0.12;
  let imageH = h * 0.76;
  
  // Disegno l'immagine del vulcano mantenendo le proporzioni - MODIFICATO
  let typeCategory = selected.getString("TypeCategory");
  let volcanoImage = getVolcanoImage(typeCategory); // Uso la nuova funzione
  
  if (volcanoImage) {
    // Calcolo dimensioni per mantenere le proporzioni senza distorsioni
    // Devo decidere se adattare alla larghezza o all'altezza del contenitore
    let imgAspect = volcanoImage.width / volcanoImage.height;
    let containerAspect = w * 0.8 / imageH * 0.8;
    
    let displayWidth, displayHeight, displayX, displayY;
    
    if (imgAspect > containerAspect) {
      // L'immagine è più larga del contenitore - adatto alla larghezza
      displayWidth = w * 0.8;
      displayHeight = w * 0.8 / imgAspect;
      displayX = x + w * 0.1;
      displayY = imageY + (imageH - displayHeight) / 2; // Centro verticalmente
    } else {
      // L'immagine è più alta del contenitore - adatto all'altezza
      displayHeight = imageH * 0.8;
      displayWidth = imageH * 0.8 * imgAspect;
      displayX = x + (w - displayWidth) / 2; // Centro orizzontalmente
      displayY = imageY + imageH * 0.1;
    }
    
    // Disegno l'immagine del vulcano centrata e mantenendo le proporzioni
    imageMode(CORNER);
    image(volcanoImage, displayX, displayY, displayWidth, displayHeight);
  } else {
    // Rettangolo di fallback se l'immagine non è disponibile
    noStroke();
    fill(30, 30, 40);
    rect(x + w * 0.1, imageY + imageH * 0.1, w * 0.8, imageH * 0.8);
  }
  
  // Footer - Categoria del tipo
  let footerY = y + h * 0.88;
  fill(colors.cream);
  rect(x, footerY, w, h * 0.12, 0, 0, 2, 2); // Solo angoli inferiori arrotondati
  
  // Linea decorativa del footer
  stroke(colors.mediumBrown);
  strokeWeight(2);
  line(x, footerY, x + w, footerY);
  
  // Ticchetti decorativi piccoli
  strokeWeight(1);
  for (let i = 0; i < 20; i++) {
    line(x + (i * w/20), footerY, x + (i * w/20), footerY - 3);
  }
  
  // Testo del footer
  textAlign(CENTER, CENTER);
  textSize(w * 0.04);
  fill(colors.lightBrown);
  noStroke();
  text("Generic Type", x + w/2, footerY + h * 0.04);
  
  textSize(w * 0.055);
  fill(colors.darkBrown);
  text(typeCategory, x + w/2, footerY + h * 0.08);
  
  // Punti decorativi nel footer
  fill(colors.accent);
  let footerDotsY = footerY + h * 0.105;
  circle(x + w/2 - 6, footerDotsY, 3);
  circle(x + w/2, footerDotsY, 3);
  circle(x + w/2 + 6, footerDotsY, 3);
  
  pop();
}

function drawInfoPanels(x, y, w, h, selected, statusDescriptions) {
  // Pannello tipo e descrizione
  // Il pannello in alto a destra con tipo specifico e descrizione
  let panel1H = h * 0.48;
  drawTypeDescriptionPanel(x, y, w, panel1H, selected);
  
  // Pannello stato
  // Il pannello in basso a destra con lo stato del vulcano
  let panel2Y = y + panel1H + 20;
  let panel2H = h - panel1H - 20;
  drawStatusPanel(x, panel2Y, w, panel2H, selected, statusDescriptions);
}

function drawTypeDescriptionPanel(x, y, w, h, selected) {
  push();
  
  // Sfondo della card
  fill(255);
  stroke(colors.mediumBrown);
  strokeWeight(2);
  rect(x, y, w, h, 2);
  
  // Angoli decorativi
  drawCardCorners(x, y, w, h);
  
  // Linea decorativa dell'header
  let headerY = y + h * 0.08;
  drawDecorativeLine(x + w/2, headerY, w * 0.35);
  
  // Titolo
  textFont('Georgia');
  textAlign(CENTER, CENTER);
  textSize(w * 0.025);
  fill(colors.lightBrown);
  noStroke();
  text("SPECIFIC TYPE", x + w/2, y + h * 0.15);
  
  // Valore del tipo
  // Il tipo specifico del vulcano (più dettagliato della categoria generica)
  textSize(w * 0.055);
  fill(colors.accent);
  text(selected.getString("Type"), x + w/2, y + h * 0.23);
  
  // Punti separatori decorativi
  // I tre punti di diverse dimensioni tra tipo e descrizione
  fill(colors.accent);
  let dotY = y + h * 0.3;
  circle(x + w/2 - 8, dotY, 4);
  circle(x + w/2, dotY, 3);
  circle(x + w/2 + 8, dotY, 2);
  
  // Box della descrizione
  let descX = x + w * 0.08;
  let descY = y + h * 0.36;
  let descW = w * 0.84;
  let descH = h * 0.55;
  
  fill(colors.cream);
  stroke(colors.orange);
  strokeWeight(1);
  drawingContext.setLineDash([5, 3]); // Bordo tratteggiato
  rect(descX, descY, descW, descH, 2);
  drawingContext.setLineDash([]);
  
  // Testo della descrizione
  fill(colors.darkBrown);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(w * 0.038);
  
  let description = selected.getString("Description");
  // Uso wrapText per spezzare il testo in più righe
  let lines = wrapText(description, descW - 20, textSize());
  let lineHeight = textSize() * 1.4;
  let currentY = descY + 10;
  
  for (let line of lines) {
    text(line, descX + 10, currentY);
    currentY += lineHeight;
  }
  
  pop();
}

function drawStatusPanel(x, y, w, h, selected, statusDescriptions) {
  push();
  
  // Sfondo della card
  fill(255);
  stroke(colors.mediumBrown);
  strokeWeight(2);
  rect(x, y, w, h, 2);
  
  // Angoli decorativi
  drawCardCorners(x, y, w, h);
  
  // Linea decorativa dell'header
  let headerY = y + h * 0.08;
  drawDecorativeLine(x + w/2, headerY, w * 0.35);
  
  // Titolo
  textFont('Georgia');
  textAlign(CENTER, CENTER);
  textSize(w * 0.025);
  fill(colors.lightBrown);
  noStroke();
  text("STATUS", x + w/2, y + h * 0.15);
  
  // Valore dello stato
  textSize(w * 0.055);
  fill(colors.orange);
  text(selected.getString("Status"), x + w/2, y + h * 0.23);
  
  // Linea divisoria
  stroke(colors.mediumBrown);
  strokeWeight(1);
  drawingContext.setLineDash([3, 3]);
  line(x + w * 0.1, y + h * 0.3, x + w * 0.9, y + h * 0.3);
  drawingContext.setLineDash([]);
  
  // Testo di spiegazione (piccolo e in corsivo)
  textSize(w * 0.032);
  fill(colors.lightBrown);
  noStroke();
  textAlign(CENTER, TOP);
  textStyle(ITALIC);
  
  let explanationText = "The Status category conveys the following hierarchical\nprogression from high to low certainty of Holocene volcanism";
  text(explanationText, x + w/2, y + h * 0.34);
  textStyle(NORMAL);
  
  // Box della descrizione
  let descX = x + w * 0.08;
  let descY = y + h * 0.52;
  let descW = w * 0.84;
  let descH = h * 0.4;
  
  fill(colors.cream);
  stroke(colors.accent);
  strokeWeight(2);
  rect(descX, descY, descW, descH, 2);
  
  // Angoli interni
  // Quelle lineette decorative dentro gli angoli del box
  stroke(colors.mediumBrown);
  strokeWeight(1);
  line(descX, descY, descX + 6, descY);
  line(descX, descY, descX, descY + 6);
  line(descX + descW, descY, descX + descW - 6, descY);
  line(descX + descW, descY, descX + descW, descY + 6);
  line(descX, descY + descH, descX + 6, descY + descH);
  line(descX, descY + descH, descX, descY + descH - 6);
  line(descX + descW, descY + descH, descX + descW - 6, descY + descH);
  line(descX + descW, descY + descH, descX + descW, descY + descH - 6);
  
  // Testo della descrizione dello stato
  fill(colors.darkBrown);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(w * 0.035);
  
  let status = selected.getString("Status");
  let statusDesc = statusDescriptions[status] || "Description not available.";
  let lines = wrapText(statusDesc, descW - 20, textSize());
  let lineHeight = textSize() * 1.4;
  let currentY = descY + 10;
  
  for (let line of lines) {
    text(line, descX + 10, currentY);
    currentY += lineHeight;
  }
  
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

function drawFooter(x, y) {
  push();
  
  // Box decorativo
  stroke(colors.accent);
  strokeWeight(2);
  noFill();
  drawingContext.setLineDash([3, 3]); // Linea tratteggiata
  rect(x - 280, y - 15, 560, 30, 0);
  drawingContext.setLineDash([]);
  
  // Testo
  textFont('Georgia');
  textSize(width * 0.01);
  fill(colors.lightBrown);
  textAlign(CENTER, CENTER);
  noStroke();
  text("Data from the Smithsonian Institution's Global Volcanism Program", x, y);
  
  pop();
}

function wrapText(str, maxWidth, textSizeVal) {
  // Controllo se la stringa è vuota
  if (!str || str.trim() === "") return [""];
  
  // Divido la stringa in parole
  let words = str.split(' ');
  let lines = [];
  let currentLine = words[0];
  
  push();
  textSize(textSizeVal);
  
  // Per ogni parola, controllo se entra nella riga corrente
  for (let i = 1; i < words.length; i++) {
    let word = words[i];
    let testLine = currentLine + ' ' + word;
    
    // Se la riga di test supera la larghezza massima
    if (textWidth(testLine) > maxWidth) {
      lines.push(currentLine); // Aggiungo la riga corrente all'array
      currentLine = word; // Inizio una nuova riga con la parola corrente
    } else {
      currentLine = testLine; // Aggiungo la parola alla riga corrente
    }
  }
  lines.push(currentLine); // Aggiungo l'ultima riga
  
  pop();
  
  return lines;
}

function handleBack() {
  console.log('Back button clicked');
  // Logica per tornare indietro (usa la cronologia del browser)
  window.history.back();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw(); // Ridisegno per adattare il layout alle nuove dimensioni
}