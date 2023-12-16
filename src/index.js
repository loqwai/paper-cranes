import {AudioProcessor} from './AudioProcessor.js';

const main = async () => {
  console.log("Main function started");
  const audioContext = new AudioContext();
  await audioContext.resume();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const sourceNode = audioContext.createMediaStreamSource(stream);
  const audioProcessor = new AudioProcessor(audioContext, sourceNode);
  document.querySelector('h1').remove();
  // Remove event listeners if no longer needed
  document.onclick = null;
  document.ontouchstart = null;
  document.onkeydown = null;

 const canvas = document.querySelector('#visualizer');
 const body = document.querySelector('body');
 body.classList.add('ready');
 const params = new URLSearchParams(window.location.search);
 const shader = params.get("shader");
 const initialImageUrl = params.get("image");
 if(!shader){
   throw new Error("No shader specified");
 }
 const viz = new ShaderToy(canvas, audioProcessor, shader, initialImageUrl);
 window.shaderToy = viz;
 await viz.init();
 viz.start();
 document.onclick = () => viz.startTime = performance.now();
 document.onkeydown = () => viz.startTime = performance.now();
}
document.onclick = main;
document.onkeydown = main;
document.ontouchstart = main;
