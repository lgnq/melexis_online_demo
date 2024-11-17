function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.toggle('show');

    const menuIcon = document.querySelector('.menu-icon');
    menuIcon.classList.toggle('open');
}

const baudRates     = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000];

const log           = document.getElementById('log');
const butConnect    = document.getElementById('butConnect');

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
}

function initBaudRate() {
  for (let rate of baudRates) {
    var option = document.createElement("option");
    option.text = rate + " Baud";
    option.value = rate;
    baudRate.add(option);
  }
}