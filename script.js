(() => {
  const canvas = document.getElementById('paint-canvas');
  const ctx = canvas.getContext('2d');
  let drawing=false;
  let tool='pen';
  let color='#000000';
  let start={x:0,y:0};
  let polygonPoints=[];

  // Undo/Redo stacks (store dataURL strings)
  const undoStack=[];
  const redoStack=[];
  const undoBtn=document.getElementById('undo-btn');
  const redoBtn=document.getElementById('redo-btn');

  function updateButtons(){
    undoBtn.disabled = undoStack.length===0;
    redoBtn.disabled = redoStack.length===0;
  }

  function pushState(){
    // Save current canvas state as dataURL
    const dataURL=canvas.toDataURL();
    undoStack.push(dataURL);
    // Clear redo stack on new action
    redoStack.length=0;
    updateButtons();
  }

  function restoreState(dataURL){
    const img=new Image();
    img.onload=function(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0);
    };
    img.src=dataURL;
  }

  function resizeCanvas(){
    canvas.width=window.innerWidth;
    canvas.height=window.innerHeight;
    // After resizing, capture empty state
    pushState();
  }
  window.addEventListener('resize',resizeCanvas);
  resizeCanvas();

  document.getElementById('tool-select').addEventListener('change',(e)=>{
    tool=e.target.value;
    if(tool==='polygon') polygonPoints=[]; // reset points when selecting
  });
  document.getElementById('color-picker').addEventListener('input',(e)=>{color=e.target.value});

  // For shape preview during drag
  let previewSnapshot=null;

  canvas.addEventListener('mousedown',startDraw);
  canvas.addEventListener('mousemove',draw);
  canvas.addEventListener('mouseup',stopDraw);
  canvas.addEventListener('mouseleave',stopDraw);
  canvas.addEventListener('click',handleClick); // for polygon points and text
  canvas.addEventListener('dblclick',finalizePolygon); // finish polygon on double click

  function startDraw(e){
    drawing=true;
    const rect=canvas.getBoundingClientRect();
    var x=e.clientX-rect.left, y=e.clientY-rect.top;
    if(tool==='pen'){
      ctx.beginPath();ctx.moveTo(x,y);
    }else if(['circle','rect','triangle','arrow'].includes(tool)){
      start.x=x;start.y=y;
      // Capture snapshot for preview
      const tmp=document.createElement('canvas');
      tmp.width=canvas.width; tmp.height=canvas.height;
      tmp.getContext('2d').drawImage(canvas,0,0);
      previewSnapshot=tmp;
    }else if(tool!=='polygon' && tool!=='text'){
      start.x=x;start.y=y;
    }
  }

  function draw(e){
    if(!drawing)return;
    const rect=canvas.getBoundingClientRect();
    var x=e.clientX-rect.left, y=e.clientY-rect.top;
    // Handle preview for shapes
    if(['circle','rect','triangle','arrow'].includes(tool) && previewSnapshot){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(previewSnapshot,0,0);
      ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
      if(tool==='circle'){
        const dx=x-start.x, dy=y-start.y;
        const r=Math.sqrt(dx*dx+dy*dy);
        ctx.beginPath();ctx.arc(start.x,start.y,r,0,Math.PI*2);ctx.stroke();
      }else if(tool==='rect'){
        const w=x-start.x, h=y-start.y;
        ctx.beginPath();ctx.rect(start.x,start.y,w,h);ctx.stroke();
      }else if(tool==='triangle'){
        const w=x-start.x;const h=y-start.y;
        ctx.beginPath();
        ctx.moveTo(start.x,start.y);
        ctx.lineTo(x,start.y);
        ctx.lineTo((start.x+x)/2,y);
        ctx.closePath();ctx.stroke();
      }else if(tool==='arrow'){
        drawArrow(ctx,start.x,start.y,x,y);
      }
      return; // preview handled, skip pen logic
    }

    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
    if(tool==='pen'){
      ctx.lineTo(x,y);ctx.stroke();
    }
  }

  function stopDraw(e){
    if(!drawing)return;
    drawing=false;
    const rect=canvas.getBoundingClientRect();
    var x=e.clientX-rect.left, y=e.clientY-rect.top;
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
    if(tool==='circle'){
      const dx=x-start.x, dy=y-start.y;
      const r=Math.sqrt(dx*dx+dy*dy);
      ctx.beginPath();ctx.arc(start.x,start.y,r,0,Math.PI*2);ctx.stroke();
    }else if(tool==='rect'){
      const w=x-start.x, h=y-start.y;
      ctx.beginPath();ctx.rect(start.x,start.y,w,h);ctx.stroke();
    }else if(tool==='triangle'){
      const w=x-start.x;const h=y-start.y;
      ctx.beginPath();
      ctx.moveTo(start.x,start.y);
      ctx.lineTo(x,start.y);
      ctx.lineTo((start.x+x)/2,y);
      ctx.closePath();ctx.stroke();
    }else if(tool==='arrow'){
      drawArrow(ctx,start.x,start.y,x,y);
    }
    previewSnapshot=null; // clear snapshot after finalizing
    pushState(); // save after shape
  }

  function handleClick(e){
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    if(tool==='polygon'){
      polygonPoints.push({x,y});
      ctx.strokeStyle=color;ctx.lineWidth=2;
      if(polygonPoints.length>1){
        const p=polygonPoints[polygonPoints.length-2];
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x,y);ctx.stroke();
      }
      ctx.fillStyle=color;
      ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    }else if(tool==='text'){
      const txt=prompt('文字を入力してください');
      if(txt){
        ctx.fillStyle=color;ctx.font='20px sans-serif';ctx.fillText(txt,x,y);
        pushState(); // save after text
      }
    }
  }

  function finalizePolygon(){
    if(tool!=='polygon' || polygonPoints.length<3) return;
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
    ctx.beginPath();
    const first=polygonPoints[0];
    ctx.moveTo(first.x,first.y);
    for(let i=1;i<polygonPoints.length;i++){
      const p=polygonPoints[i];
      ctx.lineTo(p.x,p.y);
    }
    ctx.closePath();ctx.stroke();
    polygonPoints=[];
    pushState(); // save after polygon
  }

  // Arrow drawing helper
  function drawArrow(ctx,x1,y1,x2,y2){
    const headLength=12; // px
    const angle=Math.atan2(y2-y1,x2-x1);
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI/6), y2 - headLength * Math.sin(angle - Math.PI/6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI/6), y2 - headLength * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fillStyle=ctx.strokeStyle;
    ctx.fill();
  }

  // copy button
  document.getElementById('copy-btn').addEventListener('click',async()=>{
    try{
      const dataURL=canvas.toDataURL();
      await navigator.clipboard.write([
        new ClipboardItem({'image/png':await fetch(dataURL).then(r=>r.blob())})
      ]);
      alert('コピーしました');
    }catch(err){alert('コピー失敗:'+err);}
  });

  // clear button (silent)
  document.getElementById('clear-btn').addEventListener('click',()=>{
    pushState(); // save state before clearing for undo capability
    ctx.clearRect(0,0,canvas.width,canvas.height);
  });

  // Undo / Redo buttons
  undoBtn.addEventListener('click',()=>{
    if(undoStack.length===0)return;
    const current=canvas.toDataURL();
    redoStack.push(current);
    const prev=undoStack.pop();
    restoreState(prev);
    updateButtons();
  });

  redoBtn.addEventListener('click',()=>{
    if(redoStack.length===0)return;
    const current=canvas.toDataURL();
    undoStack.push(current);
    const next=redoStack.pop();
    restoreState(next);
    updateButtons();
  });

  // Initial button state
  updateButtons();
})();