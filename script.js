// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(10,15,20);
camera.lookAt(0,0,0);
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById("scene"),antialias:true});
renderer.setSize(window.innerWidth*0.75,window.innerHeight*0.85);
renderer.xr.enabled = true;
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const dirLight=new THREE.DirectionalLight(0xffffff,1.0);
dirLight.position.set(10,20,10);
scene.add(dirLight);
scene.add(new THREE.HemisphereLight(0xffffbb,0x080820,0.6));

// ---------- DATA ----------
let ukCosts={};
fetch("data/ukCosts.json").then(r=>r.json()).then(d=>ukCosts=d);

let floors={};
let items=[];
let selected=null;
let activeFloor=0;
let activeRoom="Living Room";

// ---------- DEFAULT FLOOR & ROOMS ----------
function createFloor(floorNum=0){
  const group=new THREE.Group();
  group.position.y=floorNum*3;
  group.rooms={"Living Room":[],"Bedroom":[],"Kitchen":[],"Bathroom":[]};
  floors[floorNum]=group;
  scene.add(group);

  // Create walls for each room (simplified rectangle)
  const wallMat=new THREE.MeshStandardMaterial({color:0xd9b38c});
  const floorMat=new THREE.MeshStandardMaterial({color:0x8fbcd4,side:THREE.DoubleSide});
  for(let r in group.rooms){
    const floorGeo=new THREE.PlaneGeometry(4,4);
    const floorMesh=new THREE.Mesh(floorGeo,floorMat);
    floorMesh.rotation.x=-Math.PI/2;
    if(r=="Living Room") floorMesh.position.set(-3,0,0);
    if(r=="Bedroom") floorMesh.position.set(3,0,0);
    if(r=="Kitchen") floorMesh.position.set(-3,0,6);
    if(r=="Bathroom") floorMesh.position.set(3,0,6);
    group.add(floorMesh);
  }

  updateFloorSelect();
  updateRoomSelect();
}
createFloor(0);

// ---------- UPDATE FLOOR / ROOM SELECT ----------
function updateFloorSelect(){
  const floorSelect=document.getElementById("floorSelect");
  floorSelect.innerHTML="";
  for(let f in floors){
    const opt=document.createElement("option");
    opt.value=f;
    opt.text="Floor "+f;
    floorSelect.appendChild(opt);
  }
  floorSelect.value=activeFloor;
}
function updateRoomSelect(){
  const roomSelect=document.getElementById("roomSelect");
  roomSelect.innerHTML="";
  if(!floors[activeFloor]) return;
  for(let r in floors[activeFloor].rooms){
    const opt=document.createElement("option");
    opt.value=r;
    opt.text=r;
    roomSelect.appendChild(opt);
  }
  activeRoom=roomSelect.options[0]?.value || "";
  roomSelect.value=activeRoom;
}

// ---------- ADD FLOOR ----------
document.getElementById("addFloor").addEventListener("click",()=>{
  const floorNum=Object.keys(floors).length;
  activeFloor=floorNum;
  createFloor(floorNum);
});

// ---------- ADD ITEM ----------
function addItem(type,position,floor,room){
  const colors={"door":0x8b4513,"window":0x1e90ff,"furniture":0xff6347,"tileFloor":0xcccccc,"tileWall":0xffffcc,"sanitary":0xaaaaaa,"kitchen":0xffddaa};
  const geo=new THREE.BoxGeometry(1,1,0.5);
  const mat=new THREE.MeshStandardMaterial({color:colors[type] || 0x999999});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.copy(position);
  mesh.userData={type,materialType:null,cost:0,quantity:1,area:1,rotation:0,floor,room};
  floors[floor].rooms[room].push(mesh);
  scene.add(mesh);
  items.push(mesh);
  return mesh;
}

// Add default items to all rooms
function addDefaultItems(){
  for(let f in floors){
    for(let r in floors[f].rooms){
      const baseY=0.5+f*3;
      if(r=="Living Room"){addItem("sofa",new THREE.Vector3(-3,baseY,0),f,r);}
      if(r=="Bedroom"){addItem("bed",new THREE.Vector3(3,baseY,0),f,r);}
      if(r=="Kitchen"){addItem("cabinet",new THREE.Vector3(-3,baseY,6),f,r);}
      if(r=="Bathroom"){addItem("toilet",new THREE.Vector3(3,baseY,6),f,r);}
    }
  }
}
addDefaultItems();

// ---------- BUTTONS ----------
document.getElementById("addItem").addEventListener("click",()=>{
  const type=document.getElementById("itemType").value;
  addItem(type,new THREE.Vector3(Math.random()*4-2,0,Math.random()*4-2),activeFloor,activeRoom);
  updateHouseTotal();
});

// ---------- FLOOR / ROOM SELECT ----------
document.getElementById("floorSelect").addEventListener("change",e=>{
  activeFloor=parseInt(e.target.value);
  updateRoomSelect();
});
document.getElementById("roomSelect").addEventListener("change",e=>{
  activeRoom=e.target.value;
});

// ---------- PANEL / COST UPDATE ----------
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();
window.addEventListener("click",e=>{
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(items);
  if(hits.length){selected=hits[0].object; updateUI();}
});

function updateUI(){
  if(!selected) return;
  document.getElementById("selected").innerText=selected.userData.type;
  const select=document.getElementById("material");
  select.innerHTML="";
  Object.keys(ukCosts[selected.userData.type] || {default:{material:0,labour:0}}).forEach(m=>{
    const opt=document.createElement("option"); opt.value=m; opt.text=m; select.appendChild(opt);
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
  const cost=ukCosts[selected.userData.type][mat] || {material:0,labour:0};
  const total=(cost.material*area+cost.labour)*qty;
  selected.userData.cost=total;
  selected.userData.materialType=mat;
  selected.userData.quantity=qty;
  selected.userData.area=area;
  selected.userData.rotation=rot;
  selected.rotation.y=rot*Math.PI/180;
  document.getElementById("materialCost").innerText=(cost.material*area*qty).toFixed(2);
  document.getElementById("labourCost").innerText=(cost.labour*qty).toFixed(2);
  document.getElementById("totalCost").innerText=total.toFixed(2);
  updateHouseTotal();
}

["material","quantity","area","rotation"].forEach(id=>{
  const el=document.getElementById(id); if(el) el.addEventListener("input",updateCosts);
});

function updateHouseTotal(){
  const total=items.reduce((sum,i)=>sum+(i.userData.cost||0),0);
  document.getElementById("houseTotal").innerText=total.toFixed(2);
}

// ---------- SAVE / LOAD ----------
document.getElementById("save").addEventListener("click",()=>{
  const project={floors:{}};
  for(let f in floors){
    project.floors[f]={rooms:{}};
    for(let r in floors[f].rooms){
      project.floors[f].rooms[r]=floors[f].rooms[r].map(i=>i.userData);
    }
  }
  localStorage.setItem("adBuildingV5Project",JSON.stringify(project));
  alert("Project saved!");
});

document.getElementById("load").addEventListener("click",()=>{
  const data=JSON.parse(localStorage.getItem("adBuildingV5Project")||"{}");
  if(!data.floors) return alert("No saved project");
  items.forEach(i=>scene.remove(i));
  items=[];
  for(let f in data.floors){
    floors[f]={rooms:{}};
    for(let r in data.floors[f].rooms){
      floors[f].rooms[r]=[];
      data.floors[f].rooms[r].forEach(u=>{
        const mesh=addItem(u.type,new THREE.Vector3(u.x||0,u.y||0,u.z||0),parseInt(f),r);
        mesh.userData=u;
        mesh.rotation.y=(u.rotation||0)*Math.PI/180;
      });
    }
  }
  updateHouseTotal();
  alert("Project loaded!");
});

// ---------- EXPORT PDF ----------
document.getElementById("export").addEventListener("click",()=>{
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(14); doc.text("AD Building 5D V5 Quote",10,10); let y=20;
  items.forEach((i,idx)=>{
    doc.text(`${idx+1}. Floor: ${i.userData.floor}, Room: ${i.userData.room}, ${i.userData.type} - ${i.userData.materialType||'N/A'} - £${i.userData.cost.toFixed(2)}`,10,y); y+=10;
  });
  doc.text(`Total House Cost: £${items.reduce((s,i)=>s+(i.userData.cost||0),0).toFixed(2)}`,10,y+10);
  doc.save("AD_Building_5D_V5_Quote.pdf");
});

// ---------- AR ----------
document.getElementById("arView").addEventListener("click",()=>{
  document.body.appendChild(THREE.ARButton.createButton(renderer,{requiredFeatures:['hit-test']}));
});

// ---------- ANIMATE ----------
function animate(){requestAnimationFrame(animate); controls.update(); renderer.render(scene,camera);}
animate();
