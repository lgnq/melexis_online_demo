let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;

let prefix;
let separator;

const baudRates     = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000];

const log           = document.getElementById('log');
const butConnect    = document.getElementById('butConnect');

function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.toggle('show');

    const menuIcon = document.querySelector('.menu-icon');
    menuIcon.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', async () => {
    butConnect.addEventListener('click', clickConnect);
  
    if ('serial' in navigator) {
      console.log("webserial is supported!")
    }
    else
      console.log("webserial is not supported!")
  
    initBaudRate();
});  

async function clickConnect() {
    console.log("connect...");

    if (port) {
        await disconnect();
        toggleUIConnected(false);
        return;
      }
    
      await connect();
    
      reset();
    
      toggleUIConnected(true);    
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

async function reset() {
    // Clear the data
    log.innerHTML = "";
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

async function readLoop() {
    while (true) {
      const {value, done} = await reader.read();
  
    //   if (value) {
    //     if (value.substr(0, prefix.length) == prefix) {
    //       orientations = value.substr(prefix.length).trim().split(separator).map(x=>+x);
    //     }
    //   }
  
      if (done) {
        console.log('[readLoop] DONE', done);
        reader.releaseLock();
        break;
      }
    }
}

function initBaudRate() {
  for (let rate of baudRates) {
    var option = document.createElement("option");
    option.text = rate + " Baud";
    option.value = rate;
    baudRate.add(option);
  }
}