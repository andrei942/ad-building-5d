// ----- Scene -----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(15,15,20);
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById("scene"),antialias:true});
renderer.setSize(window.innerWidth*0.75,window.innerHeight*0.85);
renderer.xr.enabled=true;
const controls = new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const dirLight=new THREE.DirectionalLight(0xffffff,1);
dirLight.position.set(10,20,10);
scene.add(dirLight);

// ----- Data -----
let ukCosts = {};
fetch("data/ukCosts.json").then(r=>r.json()).then(d=>ukCosts=d);

let floors = {}, items=[], selected=null, activeFloor=0, activeRoom="Living Room";
const gridSize = 1; // snapping size

// ----- Create Default Floor + Rooms -----
function createFloor(floorNum=0){
    const group=new THREE.Group();
    group.position.y=floorNum*3;
    group.rooms={"Living Room":[],"Bedroom":[],"Kitchen":[],"Bathroom":[]};
    floors[floorNum]=group;
    scene.add(group);

    // Floor plane for click placement
    for(let r in group.rooms){
        const floorGeo=new THREE.PlaneGeometry(4,4);
        const floorMat=new THREE.MeshStandardMaterial({color:0x8fbcd4,side:THREE.DoubleSide});
        const floorMesh=new THREE.Mesh(floorGeo,floorMat);
        floorMesh.rotation.x=-Math.PI/2;
        if(r=="Living Room") floorMesh.position.set(-3,0,0);
        if(r=="Bedroom") floorMesh.position.set(3,0,0);
        if(r=="Kitchen") floorMesh.position.set(-3,0,6);
        if(r=="Bathroom") floorMesh.position.set(3,0,6);
        floorMesh.userData = {floor:floorNum, room:r, isFloor:true};
        group.add(floorMesh);
    }
    updateFloorSelect();
    updateRoomSelect();
}
createFloor(0);

// ----- Floor/Room Select -----
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
    activeRoom=roomSelect.options[0]?.value || "";
    roomSelect.value=activeRoom;
}
document.getElementById("floorSelect").addEventListener("change",e=>{activeFloor=parseInt(e.target.value);updateRoomSelect();});
document.getElementById("roomSelect").addEventListener("change",e=>{activeRoom=e.target.value;});

// ----- Add Floor Button -----
document.getElementById("addFloor").addEventListener("click",()=>{createFloor(Object.keys(floors).length);});

// ----- Add Item Function -----
function addItem(type,pos,floor,room){
    const colors={"door":0x8b4513,"window":0x1e90ff,"furniture":0xff6347,"tileFloor":0xcccccc,"tileWall":0xffffcc,"sanitary":0xaaaaaa,"kitchen":0xffddaa};
    const geo=new THREE.BoxGeometry(1,1,0.5);
    const mat=new THREE.MeshStandardMaterial({color:colors[type]||0x999999});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.position.copy(pos);
    mesh.userData={type,materialType:null,cost:0,quantity:1,area:1,rotation:0,floor,room};
    scene.add(mesh);
    floors[floor].rooms[room].push(mesh);
    items.push(mesh);
    return mesh;
}

// ----- Raycasting for click-to-place -----
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();
window.addEventListener("click",e=>{
    mouse.x=(e.clientX/window.innerWidth)*2-1;
    mouse.y=-(e.clientY/window.innerHeight)*2+1;
    raycaster.setFromCamera(mouse,camera);
    const intersects=raycaster.intersectObjects(scene.children,true);
    for(let inter of intersects){
        if(inter.object.userData.isFloor){
            // Snap to grid
            const x = Math.round(inter.point.x/gridSize)*gridSize;
            const z = Math.round(inter.point.z/gridSize)*gridSize;
            addItem(document.getElementById("itemType").value,new THREE.Vector3(x,0.5,z),inter.object.userData.floor,inter.object.userData.room);
            updateHouseTotal();
            break;
        }
    }
});

// ----- Costs, Panel, Save/Load/Export same as before -----
// Use previous version’s updateUI, updateCosts, save/load/export functions

// ----- Animate -----
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
animate();
