// ---------- 3D SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(15,12,20);

const renderer = new THREE.WebGLRenderer({canvas: document.getElementById("scene"), antialias:true});
renderer.setSize(window.innerWidth*0.75, window.innerHeight*0.85);
renderer.xr.enabled = true;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff,0.9));

// ---------- DATA ----------
let ukCosts = {};
fetch("data/ukCosts.json").then(r=>r.json()).then(d=>ukCosts=d);

let floors = {};   // Floor groups
let items = [];    // All items in scene
let selected = null;
let activeFloor = 0;
let activeRoom = "Living Room";

// ---------- ADD FLOOR ----------
document.getElementById("addFloor").addEventListener("click", ()=>{
  let floorNum = Object.keys(floors).length;
  let group = new THREE.Group();
  group.position.y = floorNum*3;
  group.rooms = {"Living Room": [], "Bedroom": [], "Kitchen": [], "Bathroom": []};
  scene.add(group);
  floors[floorNum] = group;

  let opt = document.createElement("option");
  opt.value = floorNum; opt.text = "Floor "+floorNum;
  document.getElementById("floorSelect").appendChild(opt);
  document.getElementById("floorSelect").value = floorNum;
  activeFloor = floorNum;
});

// ---------- ADD ITEM ----------
function addItem(type, position, floor, room){
  let geo = new THREE.BoxGeometry(1,2,0.2);
  let mat = new THREE.MeshStandardMaterial({color:0x999999});
  let mesh = new THREE.Mesh(geo,mat);
  mesh.position.copy(position);
  mesh.userData = {type,materialType:null,cost:0,quantity:1,area:1,rotation:0,floor,room};
  floors[floor].rooms[room].push(mesh);
  scene.add(mesh);
  items.push(mesh);
}

// Example: add items
addItem("door", new THREE.Vector3(0,1,0), 0, "Living Room");
addItem("window", new THREE.Vector3(2,1.5,0), 0, "Living Room");
addItem("floor", new THREE.Vector3(0,0,0), 0, "Living Room");
addItem("sofa", new THREE.Vector3(1,0,0), 0, "Living Room");

// ---------- SELECT ITEM ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener("click", e=>{
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(items);
  if(hits.length){selected = hits[0].object; updateUI();}
});

// ---------- UPDATE PANEL ----------
function updateUI(){
  if(!selected) return;
  document.getElementById("selected").innerText = selected.userData.type;

  let select = document.getElementById("material");
  select.innerHTML = "";
  Object.keys(ukCosts[selected.userData.type]||{default:{material:0,labour:0}}).forEach(m=>{
    let opt = document.createElement("option"); opt.value=m; opt.text=m; select.appendChild(opt);
  });

  document.getElementById("quantity").value = selected.userData.quantity;
  document.getElementById("area").value = selected.userData.area;
  document.getElementById("rotation").value = selected.userData.rotation;

  updateCosts();
}

function updateCosts(){
  if(!selected) return;
  const mat = document.getElementById("material").value;
  const qty = parseFloat(document.getElementById("quantity").value);
  const area = parseFloat(document.getElementById("area").value);
  const rot = parseFloat(document.getElementById("rotation").value);
  const cost = ukCosts[selected.userData.type][mat] || {material:0,labour:0};
  const total = (cost.material*area + cost.labour)*qty;

  selected.userData.cost = total;
  selected.userData.materialType = mat;
  selected.userData.quantity = qty;
  selected.userData.area = area;
  selected.userData.rotation = rot;
  selected.rotation.y = rot*Math.PI/180;

  document.getElementById("materialCost").innerText = (cost.material*area*qty).toFixed(2);
  document.getElementById("labourCost").innerText = (cost.labour*qty).toFixed(2);
  document.getElementById("totalCost").innerText = total.toFixed(2);

  updateHouseTotal();
}

function updateHouseTotal(){
  const total = items.reduce((sum,i)=>sum+(i.userData.cost||0),0);
  document.getElementById("houseTotal").innerText = total.toFixed(2);
}

// ---------- INPUT EVENTS ----------
["material","quantity","area","rotation"].forEach(id=>{
  document.getElementById(id).addEventListener("input", updateCosts);
});

// ---------- SAVE / LOAD ----------
document.getElementById("save").addEventListener("click",()=>{
  const project = {floors:{}};
  for(let f in floors){
    project.floors[f] = {rooms:{}};
    for(let r in floors[f].rooms){
      project.floors[f].rooms[r] = floors[f].rooms[r].map(i=>i.userData);
    }
  }
  localStorage.setItem("adBuildingV5Project", JSON.stringify(project));
  alert("
