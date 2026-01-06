let scene, camera, renderer;
let totalPrice = 0;
let selectedItems = [];
let pricesData = {};
let roomSelect = document.getElementById("roomSelect");
let itemSelect = document.getElementById("itemSelect");

fetch('prices.json')
  .then(res => res.json())
  .then(data => {
    pricesData = data;
    updateItemSelect();
    updatePrice();
  });

roomSelect.addEventListener('change', updateItemSelect);

function updateItemSelect(){
  let room = roomSelect.value;
  itemSelect.innerHTML = '';
  for(let item in pricesData[room]){
    let opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    itemSelect.appendChild(opt);
  }
}

function addItem(){
  let room = roomSelect.value;
  let item = itemSelect.value;
  selectedItems.push({room,item});
  let price = pricesData[room][item].material + pricesData[room][item].labour;
  totalPrice += price;
  updatePrice();
}

function updatePrice(){
  document.getElementById("price").textContent = totalPrice;
}

// 3D setup
function init3D(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe0e0e0);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight*0.6, 0.1, 1000);
  camera.position.set(8,8,10);

  renderer = new THREE.WebGLRenderer({canvas: document.getElementById("scene"), antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight*0.6);

  let ambientLight = new THREE.AmbientLight(0xffffff,0.8);
  scene.add(ambientLight);
  let dirLight = new THREE.DirectionalLight(0xffffff,0.6);
  dirLight.position.set(5,10,7);
  scene.add(dirLight);

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10,10), new THREE.MeshStandardMaterial({color:0xcccccc}));
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  animate();
}

function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene,camera);
}

init3D();

// PDF report
function generateReport(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("AD Building 5D",20,20);
  doc.setFontSize(14);
  doc.text("Full House Cost Estimate Report",20,30);

  doc.setFontSize(12);
  doc.text("Project Date: " + new Date().toLocaleDateString(),20,45);
  doc.text("Estimated Total: £" + totalPrice,20,55);

  let y = 70;
  selectedItems.forEach(i=>{
    let p = pricesData[i.room][i.item].material + pricesData[i.room][i.item].labour;
    doc.text(`${i.room} - ${i.item}: £${p}`,20,y);
    y+=10;
  });

  doc.addPage();
  doc.text("Disclaimer",20,20);
  doc.setFontSize(10);
  doc.text("This report is an estimate only. Final costs may vary based on materials, labour, and site conditions.",20,35,{maxWidth:170});

  doc.save("AD-Building-Estimate.pdf");
}
