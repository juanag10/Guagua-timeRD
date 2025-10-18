const RUTAS_JSON = "carpetajason/jason1.json";
const COND_JSON  = "carpetajason/condiciones.json";
const LANG_JSON  = "carpetajason/lang.json";

const FALLBACK_RUTAS = [
  { origen: "Villa Mella", destino: "Gazcue", tramos: [{medio:"carro",tiempo_min:20,costo:35},{medio:"guagua",tiempo_min:25,costo:40}], transbordos: 1 }
];
const FALLBACK_COND = [
  { nombre: "lluvia", tiempo_pct: 15, costo_extra: 10 },
  { nombre: "hora pico", tiempo_pct: 25, costo_extra: 0 }
];

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const rd = n => `RD$ ${Number(n||0).toLocaleString("es-DO")}`;
const debounce = (fn,t=300)=>{let h;return(...a)=>{clearTimeout(h);h=setTimeout(()=>fn(...a),t);}};

const cargarJSON = async (url, fb) => {
  try { const r = await fetch(url); if(!r.ok) throw 0; return await r.json(); }
  catch { return fb; }
};

const tiempoBase = tr => tr.reduce((a,t)=>a+(+t.tiempo_min||0),0);
const costoBase = tr => tr.reduce((a,t)=>a+(+t.costo||0),0);
const aplicarCondicionesTiempo = (min, cond) => Math.round(min * cond.reduce((a,c)=>a*(1+(+c.tiempo_pct||0)/100),1));
const costoExtra = cond => cond.reduce((a,c)=>a+(+c.costo_extra||0),0);
const calcularTotales = (ruta, cond) => ({
  tiempo_total_min: aplicarCondicionesTiempo(tiempoBase(ruta.tramos), cond),
  costo_total: costoBase(ruta.tramos) + costoExtra(cond),
  transbordos: ruta.transbordos || Math.max(0, ruta.tramos.length - 1)
});

const KEY_FAV="guaguatime_fav";
const getFav=()=>JSON.parse(localStorage.getItem(KEY_FAV)||"[]");
const setFav=v=>localStorage.setItem(KEY_FAV,JSON.stringify(v));
const addFav=f=>{const l=getFav();if(!l.some(e=>e.origen===f.origen&&e.destino===f.destino&&e.costo_total===f.costo_total&&e.tiempo_total_min===f.tiempo_total_min)){l.push(f);setFav(l);}renderFav();};
const renderFav=()=>{$("#fav-list").innerHTML=getFav().map(f=>`<li>${f.origen} → ${f.destino} · ${f.tiempo_total_min} min · ${rd(f.costo_total)}</li>`).join("")};

let i18n=null, lang="es";
const applyI18n=()=>$$("[data-i18n]").forEach(el=>{const k=el.dataset.i18n;const t=i18n?.[lang]?.[k];if(t)el.textContent=t;});

let rutasData=[],condicionesData=[];
const getCondActivas=()=>{const v=Array.from($$(".cond:checked")).map(c=>c.value);return condicionesData.filter(c=>v.includes(c.nombre));};

const ordenar=(a,c)=>{const x=[...a];if(c==="costo")x.sort((a,b)=>a.calc.costo_total-b.calc.costo_total);else if(c==="transbordos")x.sort((a,b)=>a.calc.transbordos-b.calc.transbordos);else x.sort((a,b)=>a.calc.tiempo_total_min-b.calc.tiempo_total_min);return x;};

const buscar=()=>{
  const o=$("#inp-origen").value.trim(),d=$("#inp-destino").value.trim();
  if(!o||!d){$("#lista-resultados").innerHTML="";return;}
  const cond=getCondActivas();
  const hall=rutasData.filter(r=>r.origen===o&&r.destino===d).map(r=>({...r,calc:calcularTotales(r,cond)}));
  const lista=ordenar(hall,$("#sel-ranking").value);
  $("#lista-resultados").innerHTML=lista.map(r=>`
    <li>
      <strong>${r.origen} → ${r.destino}</strong>
      <div class="meta">
        <span>⏱ ${r.calc.tiempo_total_min} min</span>
        <span>💰 ${rd(r.calc.costo_total)}</span>
        <span>🔁 ${r.calc.transbordos}</span>
      </div>
      <div class="actions">
        <button class="btn-primary" onclick='addFav(${JSON.stringify({origen:r.origen,destino:r.destino,...r.calc})})'>Agregar a favoritos</button>
      </div>
    </li>`).join("");
};

const aplicarAhorro=on=>document.body.dataset.ahorro=on?"1":"0";

(async()=>{
  const rutasRaw=await cargarJSON(RUTAS_JSON,{rutas:FALLBACK_RUTAS});
  const condRaw=await cargarJSON(COND_JSON,{condiciones:FALLBACK_COND});
  rutasData=(rutasRaw.rutas||rutasRaw).map(r=>({
    ...r,
    tramos: r.tramos.map(t=>({ ...t, medio: (t.medio||"").toLowerCase().includes("gua") ? "guagua" : "carro" }))
  }));
  condicionesData=condRaw.condiciones||condRaw;

  const barrios=new Set(); rutasData.forEach(r=>{barrios.add(r.origen);barrios.add(r.destino);});
  const dl=$("#list-barrios"); dl.innerHTML=Array.from(barrios).sort().map(b=>`<option value="${b}">`).join("");

  const langRaw=await cargarJSON(LANG_JSON,null); if(langRaw){i18n=langRaw;applyI18n();}

  $("#form-buscar").addEventListener("submit",e=>{e.preventDefault();buscar();});
  $("#sel-ranking").addEventListener("change",buscar);
  $$(".cond").forEach(c=>c.addEventListener("change",debounce(buscar,150)));
  $("#inp-origen").addEventListener("input",debounce(buscar,250));
  $("#inp-destino").addEventListener("input",debounce(buscar,250));
  $("#chk-ahorro").addEventListener("change",e=>aplicarAhorro(e.target.checked));
  $("#sel-lang").addEventListener("change",e=>{lang=e.target.value;applyI18n();});
  renderFav();

  if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
})();
