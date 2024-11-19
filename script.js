let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;

let prefix;
let separator;

let data = [0, 0, 0];

let plots = [];

let x = 0;
let y = 0;
let z = 0;

let alpha = 0;
let beta  = 0;

let size = 300;
let freq = 10;

const maxLogLength  = 50;
const baudRates     = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000];

let config = {responsive: true}

let layout_xyz = {
  autosize: true,
  // margin: { t: 5, b: 5, l: 5, r: 5 },

  title: {
    text: 'plot all the data',
    font: {
        // family: 'Arial, monospace',
        family: 'Arial, sans-serif', // Set the font family to Arial
        size: 20
    },
    yref: 'paper',
    automargin: true,
  },
  
  xaxis: {
    title: 'time',
    showgrid: false,
    zeroline: false
  },

  yaxis: {
    title: 'value',
    showline: false
  },  

  plot_bgcolor: 'rgba(255, 255, 255, 0)', // 设置图表背景透明
  paper_bgcolor: 'rgba(255, 255, 255, 0.9)', // 设置画布背景透明  
  // plot_bgcolor: 'rgba(178, 196, 203, 0)', // 设置图表背景透明
  // paper_bgcolor: 'rgba(178, 196, 203, 0.8)', // 设置画布背景透明  

};

let trace_x = {
  // type: 'scattergl',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'x',
  // fill: 'tozeroy',
  line: {
    color: 'rgb(0, 53, 75)',
    width: 1
  }
};

let trace_y = {
  // type: 'line',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'y',
  line: {
    color: 'rgb(101, 187, 169)',
    width: 1
  }
};

let trace_z = {
  // type: 'scattergl',
  // x: [0],
  y: [0],
  mode: 'lines',
  name: 'z',
  line: {
    color: 'rgb(219, 65, 64)',
    width: 1
  }
};

let data_xyz = [trace_x, trace_y, trace_z];

const grid          = document.getElementById('grid');
const log           = document.getElementById('log');
const butConnect    = document.getElementById('butConnect');
const butClear      = document.getElementById('butClear');
const baudRate      = document.getElementById('baudRate');
const autoscroll    = document.getElementById('autoscroll');
const showTimestamp = document.getElementById('showTimestamp');
const myInput       = document.getElementById('myInput');
const sampleSize    = document.getElementById('sampleSize');
const sampleFreq    = document.getElementById('sampleFreq');

function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.toggle('show');

    const menuIcon = document.querySelector('.menu-icon');
    menuIcon.classList.toggle('open');
}

async function disconnect() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }

  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }

  await port.close();
  port = null;
}

function toggleUIConnected(connected) {
  let lbl = 'Connect';

  if (connected) {
    lbl = 'Disconnect';
  }

  butConnect.textContent = lbl;
  
  // updateTheme()
}

function logData(line) {
  // Update the Log
  if (showTimestamp.checked) {
    let d = new Date();
    let timestamp = d.getHours() + ":" + `${d.getMinutes()}`.padStart(2, 0) + ":" +
        `${d.getSeconds()}`.padStart(2, 0) + "." + `${d.getMilliseconds()}`.padStart(3, 0);

    log.innerHTML += '<span class="timestamp">' + timestamp + ' -> </span>';
    
    d = null;
  }

  log.innerHTML += line+ "<br>";

  // Remove old log content
  if (log.textContent.split("\n").length > maxLogLength + 1) {
    let logLines = log.innerHTML.replace(/(\n)/gm, "").split("<br>");
    
    log.innerHTML = logLines.splice(-maxLogLength).join("<br>\n");
  }

  if (autoscroll.checked) {
    log.scrollTop = log.scrollHeight;
  }
}

class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = '';
  }

  transform(chunk, controller) {
    this.container += chunk;
    const lines = this.container.split('\n');
    this.container = lines.pop();
    lines.forEach(line => {
      controller.enqueue(line)
      logData(line);
    });
  }

  flush(controller) {
    controller.enqueue(this.container);
  }
}

async function readLoop() {
  while (true) {
    const {value, done} = await reader.read();
      
    if (value) {
      if (value.substr(0, prefix.length) == prefix) {
        data = value.substr(prefix.length).trim().split(separator).map(x=>+x);
      }
    }

    x = data[0];
    y = data[1];
    z = data[2];

    for (let i = 0; i < plots.length; i++)
    {
      Plotly.extendTraces(plots[i], {y:[[x], [y], [z]]}, [0, 1, 2], size);
    }

    if (trace_x.y.length > size)
      trace_x.y.pop();
    if (trace_y.y.length > size)
      trace_y.y.pop();
    if (trace_z.y.length > size)
      trace_z.y.pop();

    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
}

async function connect() {
  // - Request a port and open a connection.
  port = await navigator.serial.requestPort();

  // - Wait for the port to open.toggleUIConnected
  await port.open({ baudRate: baudRate.value });

  let decoder = new TextDecoderStream();
  inputDone   = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable.pipeThrough(new TransformStream(new LineBreakTransformer()));

  const encoder = new TextEncoderStream();
  outputDone    = encoder.readable.pipeTo(port.writable);
  outputStream  = encoder.writable;

  reader = inputStream.getReader();

  prefix    = document.getElementById('messageprefixid').value
  separator = document.getElementById('messageseparatorid').value

  readLoop().catch(async function(error) {
    toggleUIConnected(false);
    await disconnect();
  });
}

async function reset() {
  // Clear the data
  log.innerHTML = "";
}

async function clickConnect() {
  if (port) {
      await disconnect();
      toggleUIConnected(false);
      return;
    }
  
    await connect();
  
    reset();
  
    toggleUIConnected(true);    
}

function saveSetting(setting, value) {
    window.localStorage.setItem(setting, JSON.stringify(value));
}

async function changeBaudRate() {
    saveSetting('baudrate', baudRate.value);
}

async function clickClear() {
  reset();
}

async function clickAutoscroll() {
  saveSetting('autoscroll', autoscroll.checked);
}

async function clickTimestamp() {
  saveSetting('timestamp', showTimestamp.checked);
}

function writeCmd(event) {
  // Write to output stream
  const writer = outputStream.getWriter();

  if (event.keyCode === 13) {
    console.log(myInput.value);
    
    writer.write(myInput.value + '\r');
    myInput.value = ''
  }

  // Ignores sending carriage return if sending Ctrl+C
  // if (cmd !== "\x03") {
    // writer.write("\r"); // Important to send a carriage return after a command
  // }
  
  writer.releaseLock();
}

function initBaudRate() {
  for (let rate of baudRates) {
    var option = document.createElement("option");
    option.text = rate + " Baud";
    option.value = rate;
    baudRate.add(option);
  }
}

function loadSetting(setting, defaultValue) {
  let value = JSON.parse(window.localStorage.getItem(setting));

  if (value == null) {
    return defaultValue;
  }

  return value;
}

function loadAllSettings() {
  // Load all saved settings or defaults
  autoscroll.checked    = loadSetting('autoscroll', true);
  showTimestamp.checked = loadSetting('timestamp', false);
  // kalmanFilter.checked  = loadSetting('kalmanfilter', false);
  baudRate.value        = loadSetting('baudrate', 9600);
  // darkMode.checked      = loadSetting('darkmode', false);
}

document.addEventListener('DOMContentLoaded', async () => {
  butConnect.addEventListener('click', clickConnect);
  baudRate.addEventListener('change', changeBaudRate);
  butClear.addEventListener('click', clickClear);
  autoscroll.addEventListener('click', clickAutoscroll);
  showTimestamp.addEventListener('click', clickTimestamp);
  baudRate.addEventListener('change', changeBaudRate);
  myInput.addEventListener('keydown', writeCmd);

  if ('serial' in navigator) {
    console.log("webserial is supported!")
  }
  else
    console.log("webserial is not supported!")

  Plotly.newPlot('plot', data_xyz, layout_xyz, config);
  plots.push('plot');    

  initBaudRate();
  loadAllSettings();
});  

var j = function(p)
{
  let width = 400;

  /** The maximum stick deflection angle, in radians */
  const MAX_DEFLECT = Math.PI / 8;

  p.setup = function() 
  {
    p.createCanvas((grid.offsetWidth-10)/2, (grid.offsetHeight-30)/2, p.WEBGL);
  }

  p.draw = function() 
  {
    const stickLen = width * 0.3;

    // p.background(0xFF, 0xFF, 0xFF);
    p.background('rgba(255, 255, 255, 0.9)')

    p.ambientLight(128);
    p.directionalLight(200, 200, 200, 100, 150, -1);  // A white light from behind the viewer
    p.ambientMaterial(192);

    p.sphere(60);

    p.rotateX(-Math.PI / 2);

    p.rotateX(p.map(beta-90, -25, 25, -MAX_DEFLECT, MAX_DEFLECT));
    p.rotateZ(p.map(alpha-90, -25, 25, -MAX_DEFLECT, MAX_DEFLECT));

    // rotateY(map(mouseXRatio(), -1, 1, -MAX_DEFLECT, MAX_DEFLECT));

    p.translate(0, -stickLen / 2, 0);
    p.noStroke();

    p.cylinder(stickLen / 7, stickLen);
  }

  p.windowResized = function() 
  {
    p.resizeCanvas((grid.offsetWidth-10)/2, (grid.offsetHeight-30)/2);
  }
}
var myp5 = new p5(j, 'joystick')
