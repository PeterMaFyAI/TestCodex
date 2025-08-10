(function(){
  // DOM refs
  const video = document.getElementById('video');
  const draw = document.getElementById('draw');
  const ui = document.getElementById('ui');
  const ctx = draw.getContext('2d');
  const uictx = ui.getContext('2d');
  const camDot = document.getElementById('camStatusDot');
  const camTxt = document.getElementById('camStatus');
  const handSideEl = document.getElementById('handSide');
  const modeLabel = document.getElementById('modeLabel');
  const fpsEl = document.getElementById('fps');
  const pinchDbg = document.getElementById('pinchDbg');
  const palmDbg = document.getElementById('palmDbg');
  const sizeInput = document.getElementById('size');
  const sizeVal = document.getElementById('sizeVal');
  const hint = document.getElementById('hint');
  const ghost = document.getElementById('ghost');
  const overlay = document.getElementById('permOverlay');
  const permMsg = document.getElementById('permMsg');
  const btnRetry = document.getElementById('btn-retry');
  const btnUseMouse = document.getElementById('btn-use-mouse');
  const btnToggleCam = document.getElementById('btn-toggle-cam');
  const btnStopCam = document.getElementById('btn-stop-cam');
  const diags = document.getElementById('diagList');
  const fallbackHelp = document.getElementById('fallbackHelp');

  // Sizing
  let W=0,H=0, dpr=window.devicePixelRatio||1;
  function resize(){
    const r = draw.getBoundingClientRect();
    W = Math.round(r.width * dpr);
    H = Math.round(r.height * dpr);
    [draw, ui].forEach(c => { c.width = W; c.height = H; c.style.width = r.width+'px'; c.style.height = r.height+'px'; });
    ctx.lineCap='round'; ctx.lineJoin='round';
  }
  window.addEventListener('resize', resize);

  // State
  const state = {
    tool:'pen', color:'#22d3ee', thickness:6,
    drawing:false, lastPt:null,
    placingShape:false, shapeCenter:null, shapeSize:40,
    pinchActive:false, pinchWas:false,
    palmErase:false, lastPalmPos:null, palmOscill:0, palmDir:0,
    handSide:'–',
    cameraActive:false, processing:false, raf:0,
    mouseMode:false
  };

  // UI wiring
  document.querySelectorAll('.btn[data-tool]').forEach(btn=>{ btn.addEventListener('click', ()=> selectTool(btn.dataset.tool)); });
  document.querySelectorAll('.swatch').forEach(s=> s.addEventListener('click', ()=> setColor(s.dataset.color)));
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-save').addEventListener('click', savePNG);
  sizeInput.addEventListener('input', ()=>{ state.thickness = +sizeInput.value; sizeVal.textContent = state.thickness; });
  btnRetry.addEventListener('click', ()=>{ overlay.style.display='none'; startCamera(true); });
  btnUseMouse.addEventListener('click', ()=>{ overlay.style.display='none'; enterMouseMode(); });
  btnToggleCam.addEventListener('click', ()=>{ state.cameraActive ? stopCamera('Manuellt stoppad') : startCamera(true); });
  btnStopCam.addEventListener('click', ()=> stopCamera('Stoppad via diagnos'));

  function selectTool(tool){
    state.tool = tool;
    document.querySelectorAll('.btn[data-tool]').forEach(b=> b.classList.toggle('active', b.dataset.tool===tool));
    modeLabel.textContent = tool==='pen'?'Penna':'Form: '+(tool==='circle'?'Cirkel':'Kvadrat');
    ghost.style.display = (tool==='pen') ? 'none' : 'block';
    hint.textContent = tool==='pen' ? (state.mouseMode? 'Dra med musen för att rita' : 'Nyp på pennan, rita genom att röra pekfingret.') : (state.mouseMode? 'Skift + dra för storlek, släpp för att placera' : 'Nyp och håll för att ställa storlek, släpp för att placera.');
  }
  function setColor(c){ state.color = c; ghost.style.outlineColor = c; ghost.style.borderColor = c; }
  function clearAll(){ ctx.clearRect(0,0,W,H); }
  function savePNG(){ const a=document.createElement('a'); a.download='ritning.png'; a.href=draw.toDataURL('image/png'); a.click(); }

  selectTool('pen'); setColor('#22d3ee'); sizeVal.textContent = state.thickness;

  // MediaPipe Hands
  const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
  hands.setOptions({ selfieMode:true, maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.6, minTrackingConfidence:0.6 });
  hands.onResults(onResults);

  // Camera handling (manual getUserMedia so we can catch NotAllowedError properly)
  let stream=null;
  async function startCamera(promptUser=false){
    if(state.mouseMode){ exitMouseMode(); }
    try{
      const isSecure = location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1';
      if(!isSecure){ permMsg.innerHTML = 'Den här sidan körs inte via <b>HTTPS</b>. Kamera fungerar endast på HTTPS eller localhost.'; showOverlay('Säker kontext krävs'); updateCamStatus('Blockerad (ej HTTPS)', 'err'); return; }
      updateCamStatus('Begär kamerabehörighet…', 'warn');
      if(promptUser){ await stopCamera(); }
      stream = await navigator.mediaDevices.getUserMedia({ video:{ width:{ideal:1280}, height:{ideal:720}, facingMode:'user' }, audio:false });
      video.srcObject = stream; await video.play();
      video.classList.remove('video-hidden');
      state.cameraActive = true; state.mouseMode=false; fallbackHelp.style.display='none';
      overlay.style.display='none';
      updateCamStatus('Kamera igång', 'ok');
      loop();
    }catch(e){
      console.error('Kamerafel:', e);
      let msg = 'Okänt fel vid start av kamera.';
      if(e && (e.name==='NotAllowedError' || e.name==='PermissionDeniedError')) msg = 'Åtkomst nekad. Tillåt kamera för den här sidan i webbläsaren.';
      else if(e && e.name==='NotFoundError') msg = 'Ingen kamera hittades.';
      else if(e && e.name==='NotReadableError') msg = 'Kameran används av en annan app.';
      permMsg.innerHTML = msg;
      showOverlay('Behörighet krävs');
      updateCamStatus('Misslyckades: '+(e.name||'Error'), 'err');
      enterMouseMode();
    }
  }
  async function stopCamera(note){
    if(stream){ stream.getTracks().forEach(t=> t.stop()); stream=null; }
    state.cameraActive=false; cancelAnimationFrame(state.raf);
    video.classList.add('video-hidden');
    if(note) updateCamStatus('Av: '+note, 'warn');
  }
  function updateCamStatus(text, kind){ camTxt.textContent=text; camDot.style.color = kind==='ok'? '#86efac' : kind==='warn'? '#facc15' : '#fda4af'; }
  function showOverlay(){ overlay.style.display='flex'; }

  // Fallback mouse mode
  function enterMouseMode(){ state.mouseMode = true; fallbackHelp.style.display='block'; hint.textContent = 'Mus-läge: dra för att rita. Skift = form, E = sudd (håll).'; }
  function exitMouseMode(){ state.mouseMode=false; fallbackHelp.style.display='none'; }

  // Pointer events for mouse/touch fallback
  let pointerDown=false;
  draw.addEventListener('pointerdown', (ev)=>{
    if(!state.mouseMode) return; pointerDown=true; draw.setPointerCapture(ev.pointerId);
    const x = ev.offsetX * dpr, y = ev.offsetY * dpr;
    if(state.tool==='pen') { state.drawing=true; state.lastPt={x,y}; penDrawTo(x,y); }
    else { state.placingShape=true; state.shapeCenter={x,y}; state.shapeSize=20*dpr; updateGhost(x/dpr,y/dpr,state.shapeSize/dpr); }
  });
  draw.addEventListener('pointermove', (ev)=>{
    if(!state.mouseMode) return; const x = ev.offsetX * dpr, y = ev.offsetY * dpr;
    if(pointerDown){
      if(state.tool==='pen' && state.drawing){ penDrawTo(x,y); }
      else if(state.placingShape){ const dx=x-state.shapeCenter.x, dy=y-state.shapeCenter.y; const r=Math.max(8*dpr, Math.hypot(dx,dy)); state.shapeSize = r*2; updateGhost(state.shapeCenter.x/dpr, state.shapeCenter.y/dpr, state.shapeSize/dpr); }
    }
  });
  draw.addEventListener('pointerup', (ev)=>{
    if(!state.mouseMode) return; pointerDown=false; draw.releasePointerCapture(ev.pointerId);
    if(state.tool==='pen'){ state.drawing=false; state.lastPt=null; }
    else if(state.placingShape){ commitShape(); }
  });
  window.addEventListener('keydown', (ev)=>{ if(!state.mouseMode) return; if(ev.key==='e' || ev.key==='E'){ state.palmErase=true; draw.style.cursor='crosshair'; } });
  window.addEventListener('keyup', (ev)=>{ if(!state.mouseMode) return; if(ev.key==='e' || ev.key==='E'){ state.palmErase=false; draw.style.cursor='default'; } });

  function penDrawTo(x,y){ if(state.palmErase){ ctx.save(); ctx.globalCompositeOperation='destination-out'; const rad=Math.max(14, state.thickness*3)*dpr; ctx.beginPath(); ctx.arc(x,y,rad,0,Math.PI*2); ctx.fill(); ctx.restore(); return; } if(!state.lastPt){ state.lastPt={x,y}; return; } ctx.strokeStyle=state.color; ctx.lineWidth=state.thickness*dpr; ctx.beginPath(); ctx.moveTo(state.lastPt.x,state.lastPt.y); ctx.lineTo(x,y); ctx.stroke(); state.lastPt={x,y}; }
  function updateGhost(cx,cy,size){ ghost.style.display = (state.tool==='pen')?'none':'block'; ghost.style.left=cx+'px'; ghost.style.top=cy+'px'; ghost.style.width=size+'px'; ghost.style.height=size+'px'; ghost.style.borderRadius=(state.tool==='circle')?'999px':'12px'; }
  function commitShape(){ ctx.save(); ctx.strokeStyle=state.color; ctx.lineWidth=state.thickness*dpr; const s=state.shapeSize, cx=state.shapeCenter.x, cy=state.shapeCenter.y; if(state.tool==='circle'){ ctx.beginPath(); ctx.arc(cx,cy,s/2,0,Math.PI*2); ctx.stroke(); } else { ctx.strokeRect(cx-s/2, cy-s/2, s, s);} ctx.restore(); state.placingShape=false; }

  // Results loop (hands)
  function loop(){ if(!state.cameraActive) return; state.raf = requestAnimationFrame(async ()=>{ try{ await hands.send({image:video}); } finally { loop(); } }); }

  // Gesture thresholds & main onResults
  const lerp=(a,b,t)=>a+(b-a)*t; const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx, ay-by); const nowMs=()=>performance.now();
  let lastT=nowMs(), fps=0;
  function tickFPS(){ const t=nowMs(); const dt=t-lastT; lastT=t; fps = lerp(fps, 1000/dt, .2); fpsEl.textContent = (fps|0); }

  function onResults(res){
    tickFPS(); uictx.clearRect(0,0,W,H);
    if(!res.multiHandLandmarks || res.multiHandLandmarks.length===0){ endStroke(); state.pinchActive=false; state.palmErase=false; ghost.style.display = (state.tool==='pen')?'none':'block'; handSideEl.textContent='–'; modeLabel.textContent = state.tool==='pen'?'Penna':('Form: ' + (state.tool==='circle'?'Cirkel':'Kvadrat')); pinchDbg.textContent='–'; palmDbg.textContent='–'; return; }
    const lm = res.multiHandLandmarks[0];
    const handed = res.multiHandedness && res.multiHandedness[0] ? res.multiHandedness[0].label : '';
    handSideEl.textContent = handed === 'Right' ? 'Höger' : handed === 'Left' ? 'Vänster' : '–';

    function L(i){ return {x: lm[i].x * W, y: lm[i].y * H}; }
    const pThumb=L(4), pIndex=L(8), pMiddle=L(12), pRing=L(16), pPinky=L(20);
    const pIndexBase=L(5), pMiddleBase=L(9), pRingBase=L(13), pPinkyBase=L(17), pWrist=L(0);

    const handScale = dist(pWrist.x, pWrist.y, pMiddleBase.x, pMiddleBase.y)+1e-6;
    const pinchDist = dist(pThumb.x, pThumb.y, pIndex.x, pIndex.y);
    const pinch = pinchDist < handScale * 0.45;
    const fExt = (p, base)=> dist(p.x,p.y, base.x,base.y) > handScale*0.7;
    const palmOpen = fExt(pIndex,pIndexBase) && fExt(pMiddle,pMiddleBase) && fExt(pRing,pRingBase) && fExt(pPinky,pPinkyBase) && !pinch;
    const palmX = (pWrist.x + pMiddleBase.x)/2, palmY = (pWrist.y + pMiddleBase.y)/2;

    drawCursorDot(uictx, pIndex.x, pIndex.y);
    pinchDbg.textContent = (pinch?'ja':'nej') + ' (' + (pinchDist|0) + 'px)';
    palmDbg.textContent = palmOpen ? 'öppen' : 'stängd';

    const pinchDown = pinch && !state.pinchWas; const pinchUp = !pinch && state.pinchWas;
    function hitTestDOM(x, y, elems){
      for(const el of elems){
        const r = el.getBoundingClientRect();
        if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) return el;
      }
      return null;
    }

    if(pinchDown){
      const x = pIndex.x/dpr, y = pIndex.y/dpr;
      const hitTool = hitTestDOM(x, y, document.querySelectorAll('.btn[data-tool]'));
      if(hitTool){
        selectTool(hitTool.dataset.tool);
      } else {
        const sw = hitTestDOM(x, y, document.querySelectorAll('.swatch'));
        if(sw) setColor(sw.dataset.color);
        const ctrl = hitTestDOM(x, y, [document.getElementById('btn-clear'), document.getElementById('btn-save')]);
        if(ctrl){
          if(ctrl.id==='btn-clear') clearAll(); else savePNG();
        }
      }
    }

    if(state.tool==='pen'){
      ghost.style.display='none';
      if(pinch && !palmOpen){ const x=pIndex.x, y=pIndex.y; if(!state.drawing){ state.drawing=true; state.lastPt={x,y}; } else { ctx.strokeStyle=state.color; ctx.lineWidth=state.thickness*dpr; ctx.beginPath(); ctx.moveTo(state.lastPt.x,state.lastPt.y); ctx.lineTo(x,y); ctx.stroke(); state.lastPt={x,y}; } modeLabel.textContent='Ritar (penna)'; } else { endStroke(); }
    }

    if(state.tool==='circle' || state.tool==='square'){
      const cx=pIndex.x, cy=pIndex.y; const sizePx=Math.max(8, Math.min(240, pinchDist*2.2)); updateGhost(cx/dpr, cy/dpr, sizePx/dpr);
      if(pinch){ state.placingShape=true; state.shapeCenter={x:cx,y:cy}; state.shapeSize=sizePx; modeLabel.textContent='Förhandsvisar ' + (state.tool==='circle'?'cirkel':'kvadrat'); }
      if(pinchUp && state.placingShape){ commitShape(); modeLabel.textContent='Form placerad'; }
    }

    const palmPrev = state.lastPalmPos; state.lastPalmPos={x:palmX, y:palmY, t:performance.now()}; let eraseNow=false;
    if(palmOpen){ if(palmPrev){ const dx=palmX-palmPrev.x; const dt=(performance.now()-palmPrev.t)+1e-6; const vx=dx/dt; const dir=Math.sign(vx); if(Math.abs(vx)>0.15){ if(dir!==0 && dir!==state.palmDir){ state.palmOscill++; state.palmDir=dir; }} if(state.palmOscill>=2){ eraseNow=true; const bx=palmX, by=palmY; ctx.save(); ctx.globalCompositeOperation='destination-out'; const rad=Math.max(14, state.thickness*3)*dpr; const path=new Path2D(); path.arc(bx,by,rad,0,Math.PI*2); ctx.fill(path); ctx.restore(); uictx.save(); uictx.strokeStyle='#fca5a5'; uictx.lineWidth=2*dpr; uictx.setLineDash([6*dpr,6*dpr]); uictx.beginPath(); uictx.arc(bx,by,(rad/dpr),0,Math.PI*2); uictx.stroke(); uictx.restore(); } } state.palmErase=true; } else { state.palmErase=false; state.palmOscill=0; state.palmDir=0; }
    palmDbg.textContent = (state.palmErase ? (eraseNow?'suddar':'redo') : '—');

    state.pinchWas = pinch;
  }

  function endStroke(){ state.drawing=false; state.lastPt=null; }
  function drawCursorDot(c,x,y){ c.save(); c.shadowColor='#000'; c.shadowBlur=8*dpr; c.fillStyle='#22d3ee'; c.beginPath(); c.arc(x,y,6*dpr,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(x,y,10*dpr,0,Math.PI*2); c.globalAlpha=.25; c.fill(); c.restore(); }

  // Diagnostics & tests
  function diagLine(label, value, cls){ return `<div><b>${label}:</b> <span class="${cls||''}">${value}</span></div>`; }
  async function refreshDiags(){
    const secure = (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1');
    let perm='okänt'; try{ if(navigator.permissions && navigator.permissions.query){ const q=await navigator.permissions.query({name:'camera'}); perm=q.state; } }catch{}
    diags.innerHTML = [ diagLine('Secure context', secure?'JA':'NEJ', secure?'ok':'err'), diagLine('getUserMedia', navigator.mediaDevices?.getUserMedia?'finns':'saknas', navigator.mediaDevices?.getUserMedia?'ok':'err'), diagLine('Behörighet (Permissions API)', perm, (perm==='granted'?'ok':perm==='denied'?'err':'warn')), diagLine('Video readyState', video.readyState, (video.readyState>=2?'ok':'warn')), diagLine('Kamera aktiv', state.cameraActive?'JA':'NEJ', state.cameraActive?'ok':'warn'), diagLine('Mus-läge', state.mouseMode?'JA':'NEJ', state.mouseMode?'warn':''), diagLine('DPR', dpr, '') ].join('');
  }
  document.getElementById('btn-run-tests').addEventListener('click', async ()=>{
    const results=[]; const pass=(n,ok,why='')=>results.push(`${ok?'✅':'❌'} ${n}${why?': '+why:''}`);
    const secure = (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1');
    pass('Secure context', secure, secure?'':'- krävs för kamera');
    pass('getUserMedia', !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia));
    try{ const pre=ctx.getImageData(0,0,1,1).data[3]; ctx.fillStyle='#fff'; ctx.fillRect(0,0,1,1); const post=ctx.getImageData(0,0,1,1).data[3]; pass('Canvas ritar', post>pre); }catch(e){ pass('Canvas ritar', false, e.message); }
    pass('MediaPipe Hands laddad', !!hands);
    alert(results.join('\n'));
    refreshDiags();
  });

  // Boot
  resize(); refreshDiags();
  if(navigator.mediaDevices?.getUserMedia){ startCamera(false); } else { updateCamStatus('getUserMedia saknas', 'err'); enterMouseMode(); overlay.style.display='flex'; }
})();
