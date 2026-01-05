// ---------- 3D SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(10, 10, 15);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({canvas: document.getElementById("scene"), antialias:true});
renderer.setSize(window.innerWidth*0.75, window.innerHeight*0.85);
renderer.xr.enabled = true;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.HemisphereLight(0xffffbb,0x080820,0.6));
const dirLight = new THREE.DirectionalLight(0xffffff,0.8);
dirLight.position.set(10,20,10); scene.add(dirLight);

// ---------- DATA ----------
let ukCosts = {};
fetch("data/ukCosts.json").then(r=>r.json()).then(d=>ukCosts=d);

let floors = {};  // floor groups with rooms
let items = [];   // all items
let selected = null;
let activeFloor = 0;
let activeRoom = "Living Room";

// ---------- DEFAULT FLOOR ----------
function createFloor(width=10, depth=10, y=0){
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshStandardMaterial({color:0xdddddd, side:THREE.DoubleSide});
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI/2;
  plane.position.y = y;
  scene.add(plane);
}
createFloor();

// ---------- DEFAULT WALLS ----------
function createWall(x,y,z,w=0.2,h=3,d=10){
  const geo = new THREE.BoxGeometry(w,h,d);
  const mat = new THREE.MeshStandardMaterial({color:0xaaaaaa});
  const wall = new THREE.Mesh(geo, mat);
  wall.position.set(x,y+h/2,z);
  scene.add(wall);
}
// Back, Front, Left, Right
createWall(0,0,-5); createWall(0,0,5);
createWall(-5,0,0,0.2,3,10); createWall(5,0,0,0.2,3,10);

// ---------- ADD FLOOR BUTTON ----------
document.getElementById("addFloor").addEventListener("click", ()=>{
  const floorNum = Object.keys(floors).length;
  const group = new THREE.Group();
  group.position.y = floorNum*3;
  group.rooms = {"Living Room": [], "Bedroom": [], "Kitchen": [], "Bathroom": []};
  scene.add(group);
  floors[floorNum] = group;

  const opt = document.createElement("option");
  opt.value = floorNum; opt.text = "Floor "+floorNum;
  document.getElementById("floorSelect").appendChild(opt);
  document.getElementById("floorSelect").value = floorNum;
  activeFloor = floorNum;
});

// ---------- ADD ITEM FUNCTION ----------
function addItem(type, position, floor, room){
  const geo = new THREE.BoxGeometry(1,2,0.2);
  const mat = new THREE.MeshStandardMaterial({color:0x999999});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.userData = {type,materialType:null,cost:0,quantity:1,area:1,rotation:0,floor,room};
  floors[floor].rooms[room].push(mesh);
  scene.add(mesh);
  items.push(mesh);
  return mesh;
}

// Default items
addItem("door", new THREE.Vector3(0,1,-4.9), 0, "Living Room");
addItem("window", new THREE.Vector3(2,1.5,-4.9), 0, "Living Room");
addItem("furniture", new THREE.Vector3(1,0,0), 0, "Living Room");

// ---------- SELECT ITEM ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener("click", e=>{
  mouse.x = (e.clientX/window.innerWidth)*2-1;
  mouse.y = -(e.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(items);
  if(hits.length){selected = hits[0].object; updateUI();}
});

// ---------- PANEL UI ----------
function updateUI(){
  if(!selected) return;
  document.getElementById("selected").innerText = selected.userData.type;

  const select = document.getElementById("material");
  select.innerHTML = "";
  Object.keys(ukCosts[selected.userData.type] || {default:{material:0,labour:0}}).forEach(m=>{
    const opt = document.createElement("option"); opt.value = m; opt.text = m; select.appendChild(opt);
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
  const total = items.reduce((sum,i)=>(sum+(i.userData.cost||0)),0);
  document.getElementById("houseTotal").innerText = total.toFixed(2);
}

["material","quantity","area","rotation"].forEach(id=>{
  document.getElementById(id).addEventListener("input", updateCosts);
});

// ---------- SAVE / LOAD ----------
document.getElementById("save").addEventListener("click", ()=>{
  const project = {floors:{}};
  for(let f in floors){
    project.floors[f] = {rooms:{}};
    for(let r in floors[f].rooms){
      project.floors[f].rooms[r] = floors[f].rooms[r].map(i=>i.userData);
    }
  }
  localStorage.setItem("adBuildingV5Project", JSON.stringify(project));
  alert("Project saved!");
});

document.getElementById("load").addEventListener("click", ()=>{
  const data = JSON.parse(localStorage.getItem("adBuildingV5Project")||"{}");
  if(!data.floors) return alert("No saved project");
  items.forEach(i=>scene.remove(i));
  items=[];
  for(let f in data.floors){
    floors[f]={rooms:{}};
    for(let r in data.floors[f].rooms){
      floors[f].rooms[r]=[];
      data.floors[f].rooms[r].forEach(u=>{
        const mesh = addItem(u.type, new THREE.Vector3(u.x||0,u.y||0,u.z
