// ---------- 3D SCENE SETUP ----------
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

// ---------- UK COSTS ----------
const ukCosts = {
  door:{wood:{material:600,labour:180},steel:{material:900,labour:220},glass:{material:1200,labour:200}},
  window:{upvc:{material:800,labour:150},aluminium:{material:1400,labour:200}},
  wall:{brick:{material:55,labour:180},concrete:{material:75,labour:200}},
  floor:{tile:{material:25,labour:20},wood:{material:35,labour:25}},
  bathroomFloorTile:{ceramic:{material:30,labour:25},porcelain:{material:45,labour:35},marble:{material:90,labour:60}},
  bathroomWallTile:{ceramic:{material:28,labour:30},mosaic:{material:65,labour:55}},
  sanitary:{toilet:{material:250,labour:180},sink:{material:180,labour:150},shower:{material:600,labour:350}},
  kitchen:{cabinet:{material:200,labour:150},countertop:{material:150,labour:100},sink:{material:180,labour:150}},
  furniture:{sofa:{material:500,labour:100},bed:{material:400,labour:80},wardrobe:{material:350,labour:70}}
};

// ---------- ROOMS ----------
const rooms = { "Living Room": [], "Bedroom": [], "Kitchen": [], "Bathroom": [] };
let items = [];
let selected = null;

// ---------- CREATE ITEM ----------
function createItem(type, position, room){
  const geo = new THREE.BoxGeometry(1,2,0.2);
  const mat = new THREE.MeshStandardMaterial({color:0x999999});
  const mesh = new THREE.Mesh(geo,mat);
  mesh.position.copy(position);
  mesh.userData = {type, materialType:null, cost:0, quantity:1, area:1, rotation:0, room};
  if(type.includes("Tile")) mesh.scale.set(2,0.1,2);
  if(type==="sanitary"||type==="kitchen"||type==="furniture") mesh.scale.set(0.6,1,0.6);
  scene.add(mesh);
  rooms[room].push(mesh);
  items.push(mesh);
}

// ---------- ADD ITEMS ----------
createItem("door", new THREE.Vector3(0,1,0),"Living Room");
createItem("window", new THREE.Vector3(2,1.5,0),"Living Room");
createItem("wall", new THREE.Vector3(0,1,-2),"Living Room");
createItem("floor", new THREE.Vector3(0,0,0),"Living Room");
createItem("sofa", new THREE.Vector3(1,0,0),"Living Room");

createItem("door", new THREE.Vector3(5,1,0),"Bedroom");
createItem("window", new THREE.Vector3(6,1.5,0),"Bedroom");
createItem("floor", new THREE.Vector3(5,0,0),"Bedroom");
createItem("bed", new THREE.Vector3(5.5,0,0),"Bedroom");

createItem("kitchen","countertop",new THREE.Vector3(10,1,0),"Kitchen");
createItem("kitchen","cabinet",new THREE.Vector3(11,1,0),"Kitchen");
createItem("kitchen","sink",new THREE.Vector3(12,1,0),"Kitchen");

createItem("bathroomFloorTile", new THREE.Vector3(15,0,0),"Bathroom");
createItem("bathroomWallTile", new THREE.Vector3(15,1,-1),"Bathroom");
createItem("sanitary", new THREE.Vector3(16,1,0),"Bathroom");
createItem("sanitary", new THREE.Vector3(17,1,0),"Bathroom");

// ---------- RAYCASTING ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener("click", e=>{
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(items);
  if(hits.length){selected=hits[0].object; updateUI();}
});

// ---------- PANEL & COST ----------
function updateUI(){
  document.getElementById("selected").innerText=selected.userData.type;
  const select = document.getElementById("material");
  select.innerHTML="";
  Object.keys(ukCosts[selected.userData.type]||{default:{material:0,labour:0}}).forEach(m=>{
    const opt=document.createElement("option");opt.value=m;opt.text=m;select.appendChild(opt);
  });
  document.getElementById("quantity").value=selected.userData.quantity;
  document.getElementById("area").value=selected.userData.area;
  document.getElementById("rotation").value=selected.userData.rotation;
  updateCosts();
}

function updateCosts(){
  if(!selected) return;
  const mat=document.getElementById("material").value;
  const qty=parseFloat(document.getElementById("quantity").value);
  const area=parseFloat(document.getElementById("area").value);
  const rot=parseFloat(document.getElementById("rotation").value);
  const cost = ukCosts[selected.userData.type][mat]||{material:0,labour:0};
  const total = (cost.material*area+cost.labour)*qty;
  selected.userData.cost=total;
  selected.userData.materialType=mat;
  selected.userData.quantity=qty;
  selected.userData.area=area;
  selected.userData.rotation=rot;
  selected.rotation.y = rot * Math.PI / 180;
  document.getElementById("materialCost").innerText=(cost.material*area*qty).toFixed(2);
  document.getElementById("labourCost").innerText=(cost.labour*qty).toFixed(2);
  document.getElementById("totalCost").innerText=total.toFixed(2);
  updateHouseTotal();
}

function updateHouseTotal(){
  const total = items.reduce((sum,i)=>sum+(i.userData.cost||0),0);
  document.getElementById("houseTotal").innerText=total.toFixed(2);
}

// ---------- INPUT EVENTS ----------
document.getElementById("material").addEventListener("change",updateCosts);
document.getElementById("quantity").addEventListener("input",updateCosts);
document.getElementById("area").addEventListener("input",updateCosts);
document.getElementById("rotation").addEventListener("input",updateCosts);

// ---------- SAVE / LOAD ----------
document.getElementById("save").addEventListener("click",()=>{
  localStorage.setItem("adBuildingV3Project",JSON.stringify(items.map(i=>i.userData)));
  alert("Project saved!");
});
document.getElementById("load").addEventListener("click",()=>{
  const data=JSON.parse(localStorage.getItem("adBuildingV3Project")||"[]");
  if(!data.length)return alert("No saved project");
  data.forEach((d,i)=>{items[i].userData=d;items[i].rotation.y=(d.rotation||0)*Math.PI/180;});
  updateHouseTotal();
  alert("Project loaded!");
});

// ---------- EXPORT PDF ----------
document.getElementById("export").addEventListener("click",()=>{
  const { jsPDF } = window.jspdf; const doc=new jsPDF(); doc.setFontSize(14);
  doc.text("AD Building 5D v3 Quote",10,10); let y=20;
  items.forEach((i,idx)=>{
    doc.text(`${idx+1}. Room: ${i.userData.room}, ${i.userData.type} - ${i.userData.materialType||'N/A'} - £${i.userData.cost.toFixed(2)}`,10,y); y+=10;
  });
  doc.text(`Total House Cost: £${items.reduce((s,i)=>s+(i.userData.cost||0),0).toFixed(2)}`,10,y+10);
  doc.save("AD_Building_5D_v3_Quote.pdf");
});

// ---------- AR VIEW ----------
document.getElementById("arView").addEventListener("click", ()=>{
  document.body.appendChild(THREE.ARButton.createButton(renderer,{requiredFeatures:['hit-test']}));
});

// ---------- ANIMATE ----------
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
animate();
