// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(15,15,20);

const renderer = new THREE.WebGLRenderer({canvas: document.getElementById("scene"), antialias:true});
renderer.setSize(window.innerWidth*0.75, window.innerHeight*0.85);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff,0.7));
const dirLight = new THREE.DirectionalLight(0xffffff,1);
dirLight.position.set(10,20,10);
scene.add(dirLight);

// Load UK Costs
let ukCosts={};
fetch("data/ukCosts.json").then(r=>r.json()).then(d=>ukCosts=d);

// Globals
let floors={}, items=[], activeFloor=0, activeRoom="Living Room";
const gridSize=1;

// ----- Create Floors and Rooms -----
function createFloor(floorNum=0){
  const group = new THREE.Group();
  group.position.y = floorNum*3;
  group.rooms = {"Living Room": [], "Bedroom": [], "Kitchen": [], "Bathroom": []};
  floors[floorNum] = group;
  scene.add(group);

  for(let r in group.rooms){
    const floorGeo = new THREE.PlaneGeometry(4,4);
    const floorMat = new THREE.MeshStandardMaterial({color:0x8fbcd4, side:THREE.DoubleSide});
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI/2;
    if(r=="Living Room") floorMesh.position.set(-3,0,0);
    if(r=="Bedroom") floorMesh.position.set(3,0,0);
    if(r=="Kitchen") floorMesh.position.set(-3,0,6);
    if(r=="Bathroom") floorMesh.position.set(3,0,6);
    floorMesh.userData = {floor:floorNum, room:r, isFloor:true};
    group.add(floorMesh);
  }

  // Pre-furnish rooms with placeholder cubes
  preFurnish(group, floorNum);
  updateFloorSelect();
  updateRoomSelect();
}
createFloor(0);

// Pre-furnish function
function preFurnish(group,floorNum){
  const positions = {
    "Living Room": [{x:-3,y:0.5,z:0, type:"sofa"}, {x:-2,y:0.5,z:1, type:"table"}],
    "Bedroom": [{x:3,y:0.5,z:0, type:"bed"}, {x:2.5,y:0.5,z:1, type:"wardrobe"}],
    "Kitchen": [{x:-3,y:0.5,z:6, type:"cabinet"}, {x:-2,y:0.5,z:6.5, type:"countertop"}],
    "Bathroom": [{x:3,y:0.5,z:6, type:"sink"}, {x:2.5,y:0.5,z:6.5, type:"toilet"}]
  };
  for(let room in positions){
    positions[room].forEach(p=>{
      const mesh = createMesh(p.type,new THREE.Vector3(p.x,p.y,p.z),floorNum,room);
      group.rooms[room].push(mesh);
      items.push(mesh);
    });
  }
}

// Placeholder cube mesh
function createMesh(type,pos,floor,room){
  const geo = new THREE.BoxGeometry(1,1,0.5);
  const mat = new THREE.MeshStandardMaterial({color:0xff6347});
  const mesh = new THREE.Mesh(geo,mat);
  mesh.position.copy(pos);
  mesh.userData = {type,floor,room,cost:100};
  scene.add(mesh);
  return mesh;
}

// Floor & Room dropdowns
function updateFloorSelect(){
  const floorSelect=document.getElementById("floorSelect");
  floorSelect.innerHTML="";
  for(let f in floors){const opt=document.createElement("option");opt.value=f;opt.text="Floor "+f;floorSelect.appendChild(opt);}
  floorSelect.value=activeFloor;
}
function updateRoomSelect(){
  const roomSelect=document.getElementById("roomSelect");
  roomSelect.innerHTML="";
  for(let r in floors[activeFloor].rooms){const opt=document.createElement("option");opt.value=r;opt.text=r;roomSelect.appendChild(opt);}
  activeRoom = roomSelect.options[0]?.value || "";
  roomSelect.value = activeRoom;
}
document.getElementById("floorSelect").addEventListener("change",e=>{activeFloor=parseInt(e.target.value);updateRoomSelect();});
document.getElementById("roomSelect").addEventListener("change",e=>{activeRoom=e.target.value;});

// Animate
function animate(){requestAnimationFrame(animate); controls.update(); renderer.render(scene,camera);}
animate();
