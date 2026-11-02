/* Preserve normal links, browser history, anchor navigation and the landing preloader. */
(()=>{
  const key='bollard-page-transition';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const landing=/\/(?:index(?:\.html)?)?$/.test(location.pathname);
  try{if(sessionStorage.getItem(key)==='1'){sessionStorage.removeItem(key);if(!landing&&!reduce.matches)document.documentElement.classList.add('bollard-arriving')}}catch(_){}
  const reveal=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.remove('bollard-arriving','bollard-leaving')));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reveal,{once:true});else reveal();
  addEventListener('pageshow',event=>{if(event.persisted)document.documentElement.classList.remove('bollard-arriving','bollard-leaving')});
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||reduce.matches)return;
    const link=event.target.closest('a[href]');if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
    const next=new URL(link.href,location.href);
    if(next.origin!==location.origin||!/^https?:$/.test(next.protocol)||next.pathname===location.pathname)return;
    event.preventDefault();try{sessionStorage.setItem(key,'1')}catch(_){}
    document.documentElement.classList.add('bollard-leaving');
    setTimeout(()=>location.assign(next.href),320);
  });
})();
