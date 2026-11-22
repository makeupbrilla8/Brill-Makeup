// CONFIGURACIÓN: completaremos estos datos juntas antes de publicar.
const SUPABASE_URL = "https://peeezaodvzosqzjqfrhv.supabase.co/rest/v1/PROYECTO";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bFQwFY1xHnFnU_hVa01vCA_xg_G2So7";
const WHATSAPP_NUMBER = "5493743564397";
let db = null;
if (window.supabase && SUPABASE_URL.startsWith("https://") && SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

const money = n => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(Number(n)||0);
const $ = id => document.getElementById(id);
let products = [], cart = [], activeCategory = "Todos";

function showConfigNotice(){
  if(!db) $("products").innerHTML = '<div class="empty-state"><p>Estamos preparando la tienda 💗</p><p class="muted">Pronto vas a encontrar acá todos los productos de Brilla Makeup.</p></div>';
}
async function loadProducts(){
  if(!db){showConfigNotice();return;}
  $("products").innerHTML='<p class="muted">Cargando productos...</p>';
  const {data,error}=await db.from("Productos").select("*").order("id",{ascending:false});
  if(error){$("products").innerHTML='<p class="muted">No pudimos cargar los productos. Revisaremos la conexión.</p>';console.error(error);return;}
  products=(data||[]).filter(p=>Number(p.stock ?? 1)>0);
  renderFilters();renderProducts();
}
function renderFilters(){
  const cats=["Todos",...new Set(products.map(p=>p.categoria).filter(Boolean))];
  $("category-filters").innerHTML=cats.map(c=>`<button class="filter ${c===activeCategory?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
  document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{activeCategory=b.dataset.cat;renderFilters();renderProducts();}));
}
function renderProducts(){
  const q=$("search").value.trim().toLowerCase();
  const list=products.filter(p=>(activeCategory==="Todos"||p.categoria===activeCategory)&&(`${p.nombre||""} ${p.descripcion||""}`.toLowerCase().includes(q)));
  if(!list.length){$("products").innerHTML='<p class="muted">Todavía no hay productos para mostrar en esta categoría.</p>';return;}
  $("products").innerHTML=list.map(p=>`<article class="product-card"><div class="product-image">${p.imagen?`<img src="${escapeAttr(p.imagen)}" alt="${escapeAttr(p.nombre||"Producto")}" loading="lazy">`:"✦"}</div><div class="product-info"><h3>${escapeHtml(p.nombre||"Producto")}</h3><p>${escapeHtml(p.descripcion||p.categoria||"")}</p><div class="price-row"><span class="price">${money(p.precio)}</span><button class="add-button" data-add="${escapeAttr(p.id)}">Agregar +</button></div></div></article>`).join("");
  document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToCart(b.dataset.add)));
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function escapeAttr(v){return escapeHtml(v);}
function addToCart(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;const item=cart.find(x=>String(x.id)===String(id));if(item)item.qty++;else cart.push({...p,qty:1});renderCart();}
function renderCart(){
  $("cart-count").textContent=cart.reduce((s,x)=>s+x.qty,0);
  $("cart-total").textContent=money(cart.reduce((s,x)=>s+Number(x.precio)*x.qty,0));
  $("cart-items").innerHTML=cart.length?cart.map(p=>`<div class="cart-row"><div><strong>${escapeHtml(p.nombre)}</strong><small>${money(p.precio)} c/u</small></div><div class="qty"><button data-dec="${escapeAttr(p.id)}">−</button><span>${p.qty}</span><button data-inc="${escapeAttr(p.id)}">+</button></div></div>`).join(""):'<p class="muted">Todavía no agregaste productos.</p>';
  document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));
  document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));
}
function changeQty(id,delta){const item=cart.find(x=>String(x.id)===String(id));if(!item)return;item.qty+=delta;if(item.qty<=0)cart=cart.filter(x=>x!==item);renderCart();}
function openCart(){$("cart-panel").classList.add("open");$("overlay").classList.add("show");$("cart-panel").setAttribute("aria-hidden","false");}
function closePanels(){$("cart-panel").classList.remove("open");$("overlay").classList.remove("show");$("cart-panel").setAttribute("aria-hidden","true");}
$("cart-open").onclick=openCart;$("cart-close").onclick=closePanels;$("overlay").onclick=closePanels;$("search").addEventListener("input",renderProducts);
$("checkout").onclick=()=>{
  if(!cart.length){alert("Primero agregá algún producto al carrito.");return;}
  if(!WHATSAPP_NUMBER.startsWith("549")&&!/^\d{10,15}$/.test(WHATSAPP_NUMBER)){alert("Todavía falta configurar el WhatsApp de Brilla Makeup.");return;}
  const name=$("customer-name").value.trim();if(!name){alert("Escribí tu nombre para continuar.");return;}
  const lines=cart.map(p=>`• ${p.nombre} x${p.qty} — ${money(p.precio*p.qty)}`).join("\n");
  const total=cart.reduce((s,p)=>s+Number(p.precio)*p.qty,0);
  const msg=`¡Hola! Quiero hacer un pedido en Brilla Makeup 💗\nNombre: ${name}\n\n${lines}\n\nTotal: ${money(total)}\nForma de pago: ${$("payment").value}\n\nQuisiera coordinar disponibilidad y entrega.`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,"_blank");
};
$("admin-open").onclick=()=>{$("admin-modal").classList.add("open");$("admin-message").textContent="";};
$("admin-close").onclick=()=>$("admin-modal").classList.remove("open");
$("login-form").onsubmit=async e=>{
  e.preventDefault();if(!db){$("admin-message").textContent="Primero debemos configurar la conexión con Supabase.";return;}
  const {error}=await db.auth.signInWithPassword({email:$("admin-email").value,password:$("admin-password").value});
  $("admin-message").textContent=error?"No se pudo iniciar sesión. Revisá el email y la contraseña.":"¡Sesión iniciada!";
  if(!error){$("admin-area").hidden=false;$("login-form").hidden=true;}
};
$("product-form").onsubmit=async e=>{
  e.preventDefault();if(!db)return;
  const {data:{user}}=await db.auth.getUser();if(!user){$("admin-message").textContent="Iniciá sesión nuevamente.";return;}
  const payload={nombre:$("p-name").value.trim(),descripcion:$("p-description").value.trim(),categoria:$("p-category").value.trim(),precio:Number($("p-price").value),stock:Number($("p-stock").value),imagen:$("p-image").value.trim()};
  const {error}=await db.from("Productos").insert(payload);
  $("admin-message").textContent=error?"No se pudo guardar. Revisaremos los permisos y los campos de la tabla.":"¡Producto guardado!";
  if(!error){$("product-form").reset();$("p-stock").value=1;await loadProducts();}
};
$("logout").onclick=async()=>{if(db)await db.auth.signOut();$("admin-area").hidden=true;$("login-form").hidden=false;$("admin-message").textContent="Sesión cerrada.";};
renderCart();loadProducts();
