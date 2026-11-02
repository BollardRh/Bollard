(()=>{
  const route=document.querySelector('.journey-route');
  if(!route)return;
  const sections=[...route.querySelectorAll('.journey-section')];
  const svg=route.querySelector('.journey-track');
  const paths=[...svg.querySelectorAll('path')];
  const active=route.querySelector('.journey-track-active');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let length=0,scheduled=false,routeVisible=false,routeTop=0,routeHeight=1;
  function measure(){const r=route.getBoundingClientRect();routeTop=r.top+scrollY;routeHeight=r.height||1;}
  function draw(){
    const width=route.clientWidth,height=route.clientHeight,left=innerWidth<=760?26:48,right=width-left;
    if(right<=left)return;
    const ys=sections.map(section=>section.offsetTop+35);
    const radius=Math.min(innerWidth<=760?35:70,(right-left)/4);
    let d=`M ${left} ${ys[0]} L ${right-radius} ${ys[0]}`;
    for(let i=1;i<ys.length;i++){
      const x=i%2?right:left, next=i%2?left:right;
      const r=Math.min(radius,(ys[i]-ys[i-1])/3);
      d+=` Q ${x} ${ys[i-1]} ${x} ${ys[i-1]+r} L ${x} ${ys[i]-r} Q ${x} ${ys[i]} ${x+(i%2?-r:r)} ${ys[i]} L ${next+(i%2?r:-r)} ${ys[i]}`;
    }
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    paths.forEach(p=>p.setAttribute('d',d));
    length=active.getTotalLength();active.style.strokeDasharray=`${length} ${length}`;measure();update();
  }
  function update(){
    scheduled=false;if(!length||reduce.matches)return;
    const progress=Math.max(0,Math.min(1,(scrollY+innerHeight*.65-routeTop)/routeHeight));
    active.style.strokeDashoffset=String(length*(1-progress));
  }
  function schedule(){if(routeVisible&&!scheduled){scheduled=true;requestAnimationFrame(update)}}
  new IntersectionObserver(entries=>{routeVisible=entries[0].isIntersecting;if(routeVisible){measure();schedule()}},{rootMargin:"100px 0px"}).observe(route);
  if(!reduce.matches&&'IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-in-view',entry.isIntersecting)),{rootMargin:'0px 0px -5% 0px',threshold:0});
    sections.forEach(s=>observer.observe(s));
    document.documentElement.classList.add('journey-ready');
  }
  draw();new ResizeObserver(draw).observe(route);addEventListener('resize',draw,{passive:true});addEventListener('scroll',schedule,{passive:true});
  document.fonts?.ready.then(draw);
})();
