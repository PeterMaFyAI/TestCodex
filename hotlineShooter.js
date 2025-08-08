(()=>{
// ---------- core ----------
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const OUTSIDE='#ffd8b0',FLOOR='#dcdff6',WALL='#000',WALL_W=24;
const PLAYER_COLOR='#0a2a66',ENEMY_COLOR='#ffd83b',HEAVY_COLOR='#ff9f1c',BULLET_COLOR='#000',BLOOD_COLOR='#c32121',RETICLE_COLOR='#101';
const keys={w:0,a:0,s:0,d:0}; let mouse={x:W*0.2,y:H*0.2,down:false};

// ---------- level ----------
const rooms={ TL:{x:70,y:90,w:360,h:150}, TR:{x:600,y:30,w:500,h:300}, BL:{x:30,y:420,w:500,h:280}, BR:{x:980,y:590,w:160,h:120} };
const corridors=[ {x:365,y:160,w:355,h:60}, {x:700,y:220,w:100,h:400}, {x:480,y:540,w:260,h:60}, {x:720,y:580,w:380,h:80} ];
const rects=[rooms.TL,rooms.TR,rooms.BL,rooms.BR,...corridors];
function insideAnyRect(x,y,r=0){ const m=Math.max(0,r-2); for(const R of rects){ if(x>R.x+m&&x<R.x+R.w-m&&y>R.y+m&&y<R.y+R.h-m) return true; } return false; }
function insideRect(x,y,R,margin=0){ return x>R.x+margin&&x<R.x+R.w-margin&&y>R.y+margin&&y<R.y+R.h-margin; }

// ---------- audio ----------
const AC=new (window.AudioContext||window.webkitAudioContext)();
function clickShoot(){const o=AC.createOscillator(),g=AC.createGain();o.type='square';o.frequency.setValueAtTime(1400,AC.currentTime);o.frequency.exponentialRampToValueAtTime(2200,AC.currentTime+0.05);g.gain.setValueAtTime(0.18,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+0.08);o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+0.09);}
function wallThunk(){const b=AC.createBuffer(1,AC.sampleRate*0.08,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.2);const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=3;const g=AC.createGain();g.gain.value=0.25;s.connect(f).connect(g).connect(AC.destination);s.start();}
function splash(){const t0=AC.currentTime;const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(220,t0);o.frequency.exponentialRampToValueAtTime(90,t0+0.18);g.gain.setValueAtTime(0.28,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.22);o.connect(g).connect(AC.destination);o.start();o.stop(t0+0.25);const b=AC.createBuffer(1,AC.sampleRate*0.22,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.6);const s=AC.createBufferSource();s.buffer=b;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;const g2=AC.createGain();g2.gain.value=0.22;s.connect(lp).connect(g2).connect(AC.destination);s.start();}
function defeatBoom(){const t0=AC.currentTime;const o=AC.createOscillator(),g=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(180,t0);o.frequency.exponentialRampToValueAtTime(40,t0+0.35);g.gain.setValueAtTime(0.6,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.4);o.connect(g).connect(AC.destination);o.start();o.stop(t0+0.45);const b=AC.createBuffer(1,AC.sampleRate*0.35,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.3);const src=AC.createBufferSource();src.buffer=b;const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=200;bp.Q.value=0.6;const g2=AC.createGain();g2.gain.value=0.5;src.connect(bp).connect(g2).connect(AC.destination);src.start();}

// ---------- player ----------
const player={x:rooms.TL.x+rooms.TL.w*0.35,y:rooms.TL.y+rooms.TL.h*0.6,r:18,speed:315,angle:0,cooldown:0,alive:true};
const APEX_DEG=40,HALF=(APEX_DEG*Math.PI/180)/2,TRI_H=30,BASE_HALF=TRI_H*Math.tan(HALF);

// ---------- enemies ----------
function randInRect(R,pad=26){return{x:R.x+pad+Math.random()*(R.w-2*pad),y:R.y+pad+Math.random()*(R.h-2*pad)};}
let enemies=[];
function spawnEnemies(){
  enemies.length=0;
  for(let i=0;i<3;i++){const p=randInRect(rooms.TR);enemies.push(makeCircleEnemy(p.x,p.y,rooms.TR));}
  for(let i=0;i<2;i++){const p=randInRect(rooms.BR);enemies.push(makeCircleEnemy(p.x,p.y,rooms.BR));}
  for(let i=0;i<4;i++){const p=randInRect(rooms.BL);enemies.push(makeCircleEnemy(p.x,p.y,rooms.BL));}
  for(let i=0;i<2;i++){const p=randInRect(rooms.BL);enemies.push(makeSquareHeavy(p.x,p.y,rooms.BL));}
  separateEnemies(10);
}
function makeCircleEnemy(x,y,home){
  const e={type:'circle',x,y,r:16,home,dead:false,mode:'idle',vx:0,vy:0,tx:x,ty:y,timer:0};
  pickIdleTarget(e); return e;
}
function makeSquareHeavy(x,y,home){
  const e={type:'square',x,y,s:14,home,dead:false,hp:3,mode:'idle',vx:0,vy:0,tx:x,ty:y,timer:0};
  pickIdleTarget(e); return e;
}
function pickIdleTarget(e){const p=randInRect(e.home); e.tx=p.x; e.ty=p.y; e.timer=1.5+Math.random()*2.0;}

// ---------- projectiles, particles ----------
let bullets=[],particles=[],confetti=[];
function fire(){ if(!player.alive||winState) return;
  const dir=Math.atan2(mouse.y-player.y,mouse.x-player.x);
  const ax=player.x+Math.cos(dir)*(TRI_H*2/3), ay=player.y+Math.sin(dir)*(TRI_H*2/3);
  const speed=720;
  bullets.push({x:ax,y:ay,vx:Math.cos(dir)*speed,vy:Math.sin(dir)*speed,r:3,life:1.6});
  clickShoot();
}
function explodeEnemy(e,chunkClr){
  for(let i=0;i<38;i++){const ang=Math.random()*Math.PI*2,spd=120+Math.random()*220;
    particles.push({x:e.x,y:e.y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:2+Math.random()*3,life:0.4+Math.random()*0.6,clr:BLOOD_COLOR});}
  for(let i=0;i<8;i++){const ang=Math.random()*Math.PI*2,spd=80+Math.random()*160;
    particles.push({x:e.x,y:e.y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:4+Math.random()*3,life:0.6,clr:chunkClr});}
  splash();
}
function explodePlayer(){
  for(let i=0;i<70;i++){const a=Math.random()*Math.PI*2,s=140+Math.random()*300;
    particles.push({x:player.x,y:player.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:2+Math.random()*3,life:0.6+Math.random()*0.6,clr:BLOOD_COLOR});}
  for(let i=0;i<16;i++){const a=Math.random()*Math.PI*2,s=80+Math.random()*180;
    particles.push({x:player.x,y:player.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:3+Math.random()*3,life:0.6,clr:PLAYER_COLOR});}
  defeatBoom();
}
function wallSpark(x,y,n=10){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=60+Math.random()*120;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:1.5,life:0.25,clr:'#888'});}}

// ---------- confetti ----------
function spawnConfetti(){confetti=[];const cols=['#ffd8b0','#e3f2ff','#e9e2ff','#fff6cc','#d1ffd9','#ffd6e7'];for(let i=0;i<180;i++){confetti.push({x:Math.random()*W,y:-20-Math.random()*H,w:6+Math.random()*6,h:8+Math.random()*10,vx:(Math.random()-0.5)*60,vy:50+Math.random()*140,rot:Math.random()*Math.PI,vr:(Math.random()-0.5)*3,clr:cols[(Math.random()*cols.length)|0]});}}

// ---------- input ----------
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='w'||k==='arrowup')keys.w=1;if(k==='a'||k==='arrowleft')keys.a=1;if(k==='s'||k==='arrowdown')keys.s=1;if(k==='d'||k==='arrowright')keys.d=1;if(k===' '){e.preventDefault();mouse.down=true;}});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='w'||k==='arrowup')keys.w=0;if(k==='a'||k==='arrowleft')keys.a=0;if(k==='s'||k==='arrowdown')keys.s=0;if(k==='d'||k==='arrowright')keys.d=0;if(k===' ')mouse.down=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*(canvas.width/r.width);mouse.y=(e.clientY-r.top)*(canvas.height/r.height);});
canvas.addEventListener('mousedown',()=>{mouse.down=true;fire();});
canvas.addEventListener('mouseup',()=>{mouse.down=false;});
canvas.addEventListener('click',()=>{if(gameOver)resetGame();});

// ---------- movement helpers ----------
function tryMoveCircle(obj,dx,dy,r){ let nx=obj.x+dx*(1/60), ny=obj.y+dy*(1/60);
  if(insideAnyRect(nx,ny,r)){obj.x=nx;obj.y=ny;return;} nx=obj.x+dx*(1/60); ny=obj.y;
  if(insideAnyRect(nx,ny,r)){obj.x=nx;return;} nx=obj.x; ny=obj.y+dy*(1/60);
  if(insideAnyRect(nx,ny,r)){obj.y=ny;return;} }
function tryMoveCircleInRect(obj,dx,dy,r,R){ let nx=obj.x+dx*(1/60), ny=obj.y+dy*(1/60);
  if(insideRect(nx,ny,R,r)){obj.x=nx;obj.y=ny;return;} nx=obj.x+dx*(1/60); ny=obj.y;
  if(insideRect(nx,ny,R,r)){obj.x=nx;return;} nx=obj.x; ny=obj.y+dy*(1/60);
  if(insideRect(nx,ny,R,r)){obj.y=ny;return;} }
function lineOfSight(ax,ay,bx,by,step=8,rad=3){
  const dx=bx-ax, dy=by-ay, dist=Math.hypot(dx,dy), n=Math.max(1,Math.ceil(dist/step));
  for(let i=1;i<=n;i++){const t=i/n; const x=ax+dx*t, y=ay+dy*t; if(!insideAnyRect(x,y,rad)) return false;} return true; }
function circleHitsSquare(cx,cy,cr,sx,sy,half){ const dx=Math.max(Math.abs(cx-sx)-half,0), dy=Math.max(Math.abs(cy-sy)-half,0); return dx*dx+dy*dy < cr*cr; }

// ---------- enemy separation ----------
const MIN_SEP=32;
function separateEnemies(iter=2){
  for(let it=0; it<iter; it++){
    for(let i=0;i<enemies.length;i++){
      const A=enemies[i]; if(A.dead) continue;
      for(let j=i+1;j<enemies.length;j++){
        const B=enemies[j]; if(B.dead) continue;
        let dx=B.x-A.x, dy=B.y-A.y, dist=Math.hypot(dx,dy);
        if(dist===0){dx=1e-6; dy=0; dist=1e-6;}
        const need=MIN_SEP - dist;
        if(need>0){
          const nx=dx/dist, ny=dy/dist, push=(need/2)+0.5;
          let ax=A.x - nx*push, ay=A.y - ny*push;
          let bx=B.x + nx*push, by=B.y + ny*push;
          if(A.type==='square'){ if(insideRect(ax,ay,A.home,A.s)) {A.x=ax; A.y=ay;} }
          else { if(insideAnyRect(ax,ay,A.r-2)) {A.x=ax; A.y=ay;} }
          if(B.type==='square'){ if(insideRect(bx,by,B.home,B.s)) {B.x=bx; B.y=by;} }
          else { if(insideAnyRect(bx,by,B.r-2)) {B.x=bx; B.y=by;} }
        }
      }
    }
  }
}

// ---------- bullet helpers ----------
function segCircleHit(x1,y1,x2,y2,cx,cy,r){
  const dx=x2-x1, dy=y2-y1, fx=x1-cx, fy=y1-cy;
  const a=dx*dx+dy*dy, b=2*(fx*dx+fy*dy), c=fx*fx+fy*fy - r*r, disc=b*b-4*a*c;
  if(disc<0) return null;
  const s=Math.sqrt(disc), t1=(-b-s)/(2*a), t2=(-b+s)/(2*a);
  let t=null; if(t1>=0&&t1<=1) t=t1; else if(t2>=0&&t2<=1) t=t2; return t;
}
function segAABBHit(x1,y1,x2,y2,minx,miny,maxx,maxy){
  const dx=x2-x1, dy=y2-y1; let tmin=0, tmax=1;
  if(dx===0){ if(x1<minx||x1>maxx) return null; }
  else{ let tx1=(minx-x1)/dx, tx2=(maxx-x1)/dx; if(tx1>tx2){const t=tx1;tx1=tx2;tx2=t;}
        tmin=Math.max(tmin,tx1); tmax=Math.min(tmax,tx2); if(tmax<tmin) return null; }
  if(dy===0){ if(y1<miny||y1>maxy) return null; }
  else{ let ty1=(miny-y1)/dy, ty2=(maxy-y1)/dy; if(ty1>ty2){const t=ty1;ty1=ty2;ty2=t;}
        tmin=Math.max(tmin,ty1); tmax=Math.min(tmax,ty2); if(tmax<tmin) return null; }
  return (tmin>=0&&tmin<=1)?tmin:null;
}

function hitEnemy(e,shape){
  if(shape==='circle'){ e.dead=true; explodeEnemy(e,ENEMY_COLOR); }
  else{ e.hp-=1; splash(); if(e.hp<=0){ e.dead=true; explodeEnemy(e,HEAVY_COLOR); } }
}

// ---------- loop ----------
let winState=false,gameOver=false;
const overlay=document.getElementById('overlay'); const msg=document.getElementById('msg');
document.getElementById('replay').onclick=()=>resetGame();

let last=performance.now();
function loop(t){const dt=Math.min(0.032,(t-last)/1000);last=t;step(dt);draw();requestAnimationFrame(loop);}

// ---------- step ----------
function step(dt){
  // aim + fire
  player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);
  player.cooldown-=dt;
  if(mouse.down&&player.cooldown<=0&&player.alive&&!winState){fire();player.cooldown=0.11;}

  // player move
  let vx=(keys.d-keys.a)*player.speed, vy=(keys.s-keys.w)*player.speed;
  if(vx&&vy){const k=Math.SQRT1_2;vx*=k;vy*=k;}
  tryMoveCircle(player,vx,vy,14);

  // bullets: substep continuous collision. First contact removes bullet.
  bulletLoop: for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    let remaining=dt;
    while(remaining>0){
      // handle immediate overlap before advancing
      let overlap=null, otype='';
      for(const e of enemies){
        if(e.dead) continue;
        if(e.type==='circle'){
          if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+b.r){ overlap=e; otype='circle'; break; }
        }else{
          if(circleHitsSquare(b.x,b.y,b.r,e.x,e.y,e.s)){ overlap=e; otype='square'; break; }
        }
      }
      if(overlap){
        hitEnemy(overlap,otype);
        bullets.splice(i,1);
        continue bulletLoop;
      }

      const step=Math.min(remaining,1/240); // ~4.17 ms => ~3 px step at 720 px/s
      const px=b.x, py=b.y, nx=px+b.vx*step, ny=py+b.vy*step;

      // find earliest enemy hit on this substep
      let bestT=Infinity, target=null, ttype='';
      for(const e of enemies){
        if(e.dead) continue;
        if(e.type==='circle'){
          const t=segCircleHit(px,py,nx,ny,e.x,e.y,e.r+b.r);
          if(t!=null && t<bestT){ bestT=t; target=e; ttype='circle'; }
        }else{
          const half=e.s+b.r;
          const t=segAABBHit(px,py,nx,ny,e.x-half,e.y-half,e.x+half,e.y+half);
          if(t!=null && t<bestT){ bestT=t; target=e; ttype='square'; }
        }
      }

      if(target){
        b.x = px + (nx - px) * bestT;
        b.y = py + (ny - py) * bestT;
        hitEnemy(target,ttype);
        bullets.splice(i,1);
        continue bulletLoop;
      }

      // no enemy hit this substep: wall or advance
      if(!insideAnyRect(nx,ny,1.5)){
        wallThunk(); wallSpark(nx,ny,8);
        bullets.splice(i,1);
        continue bulletLoop;
      }

      b.x=nx; b.y=ny; b.life-=step; remaining-=step;
      if(b.life<=0){ bullets.splice(i,1); continue bulletLoop; }
    }
  }

  // enemies AI
  for(const e of enemies){
    if(e.dead) continue;
    if(e.type==='circle'){
      const inSameRoom = insideRect(player.x,player.y,e.home);
      const los = lineOfSight(e.x,e.y,player.x,player.y,8,3) && Math.hypot(e.x-player.x,e.y-player.y) < 720;
      if(inSameRoom || los) e.mode='chase';
      if(e.mode==='chase'){ const ang=Math.atan2(player.y-e.y,player.x-e.x), spd=200; e.vx=Math.cos(ang)*spd; e.vy=Math.sin(ang)*spd; tryMoveCircle(e,e.vx,e.vy,e.r-2); }
      else{ e.timer-=dt; if(e.timer<=0 || Math.hypot(e.tx-e.x,e.ty-e.y)<6) pickIdleTarget(e);
            const ang=Math.atan2(e.ty-e.y,e.tx-e.x), spd=55; e.vx=Math.cos(ang)*spd; e.vy=Math.sin(ang)*spd; tryMoveCircleInRect(e,e.vx,e.vy,e.r-2,e.home); }
      if(player.alive && Math.hypot(e.x-player.x,e.y-player.y) < e.r + 14){ player.alive=false; gameOver=true; explodePlayer(); showOverlay("You were caught — click to restart"); }
    }else{
      const playerInBL = insideRect(player.x,player.y,e.home);
      if(playerInBL) e.mode='chase';
      if(e.mode==='chase'){ const ang=Math.atan2(player.y-e.y,player.x-e.x), spd=220; e.vx=Math.cos(ang)*spd; e.vy=Math.sin(ang)*spd; tryMoveCircleInRect(e,e.vx,e.vy,e.s,e.home); }
      else{ e.timer-=dt; if(e.timer<=0 || Math.hypot(e.tx-e.x,e.ty-e.y)<6) pickIdleTarget(e);
            const ang=Math.atan2(e.ty-e.y,e.tx-e.x), spd=50; e.vx=Math.cos(ang)*spd; e.vy=Math.sin(ang)*spd; tryMoveCircleInRect(e,e.vx,e.vy,e.s,e.home); }
      if(player.alive && circleHitsSquare(player.x,player.y,14,e.x,e.y,e.s)){ player.alive=false; gameOver=true; explodePlayer(); showOverlay("You were caught — click to restart"); }
    }
  }

  // keep enemies separated
  separateEnemies(2);

  // particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.life-=dt; if(p.life<=0){particles.splice(i,1);continue;}
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.98; p.vy*=0.98; p.vy+=40*dt;
  }

  // win
  if(!winState && enemies.length>0 && enemies.every(e=>e.dead)){
    winState=true; spawnConfetti(); showOverlay("All enemies eliminated!");
  }
}

// ---------- draw ----------
function drawWallsAndFloor(){
  ctx.fillStyle=OUTSIDE; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=FLOOR; for(const R of rects) ctx.fillRect(R.x,R.y,R.w,R.h);
  ctx.save(); ctx.globalCompositeOperation='destination-over';
  ctx.strokeStyle=WALL; ctx.lineWidth=WALL_W;
  for(const R of rects) ctx.strokeRect(R.x,R.y,R.w,R.h);
  ctx.restore();
}
function draw(){
  drawWallsAndFloor();

  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.clr;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;

  for(const e of enemies){
    if(e.dead) continue;
    if(e.type==='circle'){
      ctx.fillStyle=ENEMY_COLOR; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#000'; ctx.stroke();
    }else{
      ctx.fillStyle=HEAVY_COLOR; ctx.lineWidth=2; ctx.strokeStyle='#000';
      ctx.fillRect(e.x-e.s, e.y-e.s, e.s*2, e.s*2); ctx.strokeRect(e.x-e.s, e.y-e.s, e.s*2, e.s*2);
      ctx.fillStyle='#000'; for(let k=0;k<e.hp;k++){ ctx.fillRect(e.x-e.s+4+k*8, e.y-e.s-6, 6, 4); }
    }
  }

  const a=player.angle;
  const apexX=player.x+Math.cos(a)*(TRI_H*2/3), apexY=player.y+Math.sin(a)*(TRI_H*2/3);
  const baseCx=player.x-Math.cos(a)*(TRI_H/3), baseCy=player.y-Math.sin(a)*(TRI_H/3);
  const px=-Math.sin(a), py=Math.cos(a);
  const b1x=baseCx+px*BASE_HALF, b1y=baseCy+py*BASE_HALF;
  const b2x=baseCx-px*BASE_HALF, b2y=baseCy-py*BASE_HALF;
  if(player.alive){
    ctx.fillStyle=PLAYER_COLOR; ctx.strokeStyle='#000'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(apexX,apexY); ctx.lineTo(b1x,b1y); ctx.lineTo(b2x,b2y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  ctx.fillStyle=BULLET_COLOR; for(const b of bullets){ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();}

  ctx.save(); ctx.translate(mouse.x,mouse.y); ctx.strokeStyle=RETICLE_COLOR; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(-4,0); ctx.moveTo(4,0); ctx.lineTo(14,0);
  ctx.moveTo(0,-14); ctx.lineTo(0,-4); ctx.moveTo(0,4); ctx.lineTo(0,14); ctx.stroke(); ctx.restore();

  if(winState){for(const c of confetti){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.rot);ctx.fillStyle=c.clr;ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h);ctx.restore();}}
}

// ---------- overlay ----------
function showOverlay(text){overlay.style.display='grid';msg.textContent=text;}
function hideOverlay(){overlay.style.display='none';}

// ---------- reset ----------
function resetGame(){
  winState=false; gameOver=false; hideOverlay();
  bullets.length=0; particles.length=0; confetti=[]; spawnEnemies();
  player.x=rooms.TL.x+rooms.TL.w*0.35; player.y=rooms.TL.y+rooms.TL.h*0.6;
  player.alive=true; player.cooldown=0;
}
document.getElementById('replay').addEventListener('click',()=>resetGame());

// resume audio on first interaction
['click','keydown'].forEach(ev=>addEventListener(ev,()=>{if(AC.state==='suspended') AC.resume();},{once:true}));

// init
resetGame(); requestAnimationFrame(loop);
})();
